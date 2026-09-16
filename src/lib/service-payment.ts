import { createServiceClient } from "@/lib/supabase/server";
import { capturePaypalOrder } from "@/lib/paypal";
import { sendEmail } from "@/lib/resend/send-email";
import { appointmentConfirmationEmail } from "@/lib/resend/email-templates";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface CaptureResult {
  success: boolean;
  alreadyCompleted?: boolean;
  error?: string;
  appointmentId?: string;
  paidAmount?: number;
  /** True when the captured payment was a deposit, not the full service price. */
  isDeposit?: boolean;
}

function genericError(prefix: string, err: unknown): string {
  const errorId = Date.now().toString(36);
  console.error(`${prefix} [${errorId}]`, err);
  return `No se pudo procesar el pago, intenta de nuevo. (ref: ${errorId})`;
}

/**
 * Captures a PayPal order and finalizes the booking (appointment + payment).
 * Idempotent: calling twice with a session already 'completed' is a no-op.
 */
export async function finalizePaypalPayment(
  sessionId: string,
  orderId: string
): Promise<CaptureResult> {
  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("payment_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return { success: false, error: "Sesión de pago no encontrada" };
  }

  if (session.status === "completed") {
    return {
      success: true,
      alreadyCompleted: true,
      isDeposit: session.session_type === "deposit",
    };
  }

  // M-1: this must always be a strict equality check. Leaving the session's
  // paypal_order_id nullable-and-unchecked would let a caller supply *any*
  // orderId for a session that hasn't stored one yet.
  if (session.paypal_order_id !== orderId) {
    return { success: false, error: "Orden de pago no coincide con la sesión" };
  }

  // M-5: reject expired checkout sessions before attempting to capture.
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return { success: false, error: "La sesión de pago expiró" };
  }

  // M-4: don't allow booking a slot that has already passed.
  const appointmentStart = new Date(
    `${session.appointment_date}T${session.start_time}`
  );
  if (!Number.isNaN(appointmentStart.getTime()) && appointmentStart < new Date()) {
    return { success: false, error: "La fecha de la cita ya pasó" };
  }

  // M-4: reject if there's already a confirmed/pending appointment for the
  // same business + date + overlapping time range. Simple overlap query
  // (no DB exclusion constraint) — good enough given no employee_id is
  // tracked on payment_sessions today.
  // TODO(seguridad/DB): considerar un exclusion constraint en Postgres para
  // garantizar esto a nivel de base de datos y no solo aplicación.
  const { data: overlapping } = await supabase
    .from("appointments")
    .select("id")
    .eq("business_id", session.business_id)
    .eq("date", session.appointment_date)
    .in("status", ["pending", "confirmed"])
    .lt("start_time", session.end_time)
    .gt("end_time", session.start_time)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return {
      success: false,
      error: "Ese horario ya no está disponible, elige otro.",
    };
  }

  let capture;
  try {
    capture = await capturePaypalOrder(orderId);
  } catch (err) {
    return {
      success: false,
      error: genericError("finalizePaypalPayment: capture failed", err),
    };
  }

  if (capture.status !== "COMPLETED") {
    return { success: false, error: "El pago no se completó" };
  }

  // Resolve the client user by email (create if needed with service role).
  // TODO(seguridad): esto crea una cuenta de usuario real (auth.users) para
  // cualquier email que llegue en el checkout de invitado, sin verificar
  // que su dueño la solicitó. Es un riesgo de creación de cuentas no
  // solicitadas; fuera de alcance de este fix (requiere volver
  // appointments.client_id nullable y tocar todo el flujo de clientes).
  let clientId: string | null = null;
  const email = session.client_email?.toLowerCase();
  if (email) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
    } else {
      const { data: createdUser, error: createUserErr } =
        await supabase.auth.admin.createUser({
          email,
          password: crypto.randomUUID().slice(0, 20),
          email_confirm: true,
          user_metadata: { full_name: session.client_name },
        });
      // The on_auth_user_created trigger populates public.users automatically
      if (!createUserErr && createdUser.user) {
        clientId = createdUser.user.id;
      }
    }
  }

  // Load service name + business name (for the confirmation email).
  const [{ data: service }, { data: business }] = await Promise.all([
    supabase.from("services").select("name").eq("id", session.service_id).maybeSingle(),
    supabase.from("businesses").select("name").eq("id", session.business_id).maybeSingle(),
  ]);

  // Sesiones creadas antes de esta migración no tienen session_type; se
  // tratan como pago completo ('full').
  const isDeposit = session.session_type === "deposit";
  // amount_dop guarda el monto en la moneda local del negocio: el precio
  // completo del servicio en sesiones 'full', o el monto del depósito en
  // sesiones 'deposit'. El registro en `payments` (más abajo) guarda el
  // monto realmente capturado por PayPal en USD.
  const amountLocal = Number(session.amount_dop);

  // Insert appointment
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert({
      business_id: session.business_id,
      service_id: session.service_id,
      client_id: clientId,
      date: session.appointment_date,
      start_time: session.start_time,
      end_time: session.end_time,
      status: "confirmed",
      notes: session.notes,
      cancel_token: session.cancel_token,
      ...(isDeposit
        ? { deposit_amount: amountLocal, deposit_status: "paid" as const }
        : {}),
    })
    .select("id")
    .single();

  if (apptError || !appointment) {
    // M-2 (best-effort, no automatic refund): the PayPal payment was
    // already captured but we couldn't persist the appointment. Mark the
    // session as failed with a note so the business owner can reconcile
    // manually (refund via PayPal dashboard if appropriate), and log
    // loudly so this is easy to find in server logs.
    console.error(
      `finalizePaypalPayment: captured payment but appointment insert failed. ` +
        `orderId=${orderId} sessionId=${session.id} captureId=${capture.captureId}`,
      apptError
    );
    await supabase
      .from("payment_sessions")
      .update({
        status: "failed",
        paypal_capture_id: capture.captureId,
      })
      .eq("id", session.id);

    return {
      success: false,
      error: genericError("finalizePaypalPayment: appointment insert failed", apptError),
    };
  }

  // Insert completed payment (USD, paypal)
  const paypalTxnId = capture.captureId;
  await supabase.from("payments").insert({
    business_id: session.business_id,
    appointment_id: appointment.id,
    amount: Number(capture.amount.value ?? session.amount_usd),
    currency: "USD",
    method: "paypal",
    status: "completed",
    paypal_transaction_id: paypalTxnId,
    // QA-7: distinguish deposit payments from full-price payments in reports.
    is_deposit: isDeposit,
  });

  // Mark session completed
  await supabase
    .from("payment_sessions")
    .update({ status: "completed", paypal_capture_id: paypalTxnId })
    .eq("id", session.id);

  // Send confirmation email (best-effort, never blocks the booking).
  // C-4: calls the Resend helper directly instead of doing a self-HTTP
  // fetch to our own /api/emails/appointment-confirmation route — this is
  // already a trusted server-side context (service role), so there's no
  // reason to round-trip through a public API route.
  if (session.client_email) {
    try {
      const html = appointmentConfirmationEmail({
        businessName: business?.name ?? "Agendalo",
        clientName: session.client_name || "Cliente",
        serviceName: service?.name ?? "Servicio",
        date: format(
          new Date(`${session.appointment_date}T00:00:00`),
          "EEEE, d 'de' MMMM, yyyy",
          { locale: es }
        ),
        startTime: session.start_time,
        endTime: session.end_time,
        price: amountLocal.toLocaleString("es-DO"),
        currency: session.currency ?? "DOP",
        appointmentId: appointment.id,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/cancelar/${session.cancel_token}`,
        ...(isDeposit
          ? {
              priceNote:
                "Este monto corresponde al depósito para garantizar tu cita. El resto del pago se realiza en el negocio.",
            }
          : {}),
      });

      await sendEmail({
        to: session.client_email,
        subject: `¡Cita confirmada en ${business?.name ?? "Agendalo"}! - Agendalo`,
        html,
      });
    } catch (err) {
      console.error("finalizePaypalPayment: confirmation email failed", err);
    }
  }

  return {
    success: true,
    appointmentId: appointment.id,
    paidAmount: Number(session.amount_usd),
    isDeposit,
  };
}
