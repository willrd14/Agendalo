import { createServiceClient } from "@/lib/supabase/server";
import { capturePaypalOrder } from "@/lib/paypal";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface CaptureResult {
  success: boolean;
  alreadyCompleted?: boolean;
  error?: string;
  appointmentId?: string;
  paidAmount?: number;
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
    return { success: true, alreadyCompleted: true };
  }

  if (session.paypal_order_id && session.paypal_order_id !== orderId) {
    return { success: false, error: "Orden de pago no coincide con la sesión" };
  }

  let capture;
  try {
    capture = await capturePaypalOrder(orderId);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al capturar el pago",
    };
  }

  if (capture.status !== "COMPLETED") {
    return { success: false, error: "El pago no se completó" };
  }

  // Resolve the client user by email (create if needed with service role)
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

  // Load service name
  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", session.service_id)
    .maybeSingle();

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
    })
    .select("id")
    .single();

  if (apptError || !appointment) {
    return {
      success: false,
      error: `Error al crear la cita: ${apptError?.message}`,
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
  });

  // Mark session completed
  await supabase
    .from("payment_sessions")
    .update({ status: "completed", paypal_capture_id: paypalTxnId })
    .eq("id", session.id);

  // Send confirmation email (best-effort)
  if (session.client_email) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/emails/appointment-confirmation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: session.client_email,
            data: {
              clientName: session.client_name || "Cliente",
              serviceName: service?.name ?? "Servicio",
              date: format(
                new Date(`${session.appointment_date}T00:00:00`),
                "EEEE, d 'de' MMMM, yyyy",
                { locale: es }
              ),
              startTime: session.start_time,
              endTime: session.end_time,
              appointmentId: appointment.id,
              cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/cancelar/${session.cancel_token}`,
            },
          }),
        }
      );
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    appointmentId: appointment.id,
    paidAmount: Number(session.amount_usd),
  };
}
