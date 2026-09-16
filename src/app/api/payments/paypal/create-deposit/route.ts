import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { createPaypalOrder } from "@/lib/paypal";
import { getActiveBusinessPlan, isProPlan } from "@/lib/plans";
import { getClientIp } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// Minimum charge accepted via PayPal, to avoid symbolic/near-zero payments.
const MIN_CHARGE_USD = 1;
const MAX_SESSIONS_PER_IP_WINDOW = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;

const bodySchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1).max(200),
  clientName: z.string().max(200).optional().default(""),
  clientEmail: z.string().email().max(320),
  clientPhone: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida"),
  // price / conversionRate sent by the client are intentionally NOT part of
  // this schema: they are never trusted (see C-2). The real price and
  // conversion rate are loaded server-side from the database below.
});

function genericError(prefix: string, err: unknown): string {
  const errorId = Date.now().toString(36);
  console.error(`${prefix} [${errorId}]`, err);
  return `No se pudo procesar el pago, intenta de nuevo. (ref: ${errorId})`;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const supabase = createServiceClient();
    const clientIp = getClientIp(req);

    // A-3: throttle checkout session creation per IP.
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    ).toISOString();
    if (clientIp !== "unknown") {
      const { count } = await supabase
        .from("payment_sessions")
        .select("id", { count: "exact", head: true })
        .eq("client_ip", clientIp)
        .gte("created_at", windowStart);
      if ((count ?? 0) >= MAX_SESSIONS_PER_IP_WINDOW) {
        return NextResponse.json(
          { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
          { status: 429 }
        );
      }
    }

    // Verify the business has PayPal enabled
    const { data: paypalMethod } = await supabase
      .from("business_payment_methods")
      .select("is_enabled, paypal_conversion_rate")
      .eq("business_id", body.businessId)
      .eq("type", "paypal")
      .maybeSingle();

    if (!paypalMethod?.is_enabled) {
      return NextResponse.json(
        { error: "PayPal no está habilitado para este negocio" },
        { status: 400 }
      );
    }

    const conversionRate = Number(paypalMethod.paypal_conversion_rate);
    if (!conversionRate || conversionRate <= 0) {
      return NextResponse.json(
        { error: "Tipo de cambio no configurado" },
        { status: 400 }
      );
    }

    // El depósito para garantizar citas es una función exclusiva del plan
    // Pro, sin prueba gratuita (a diferencia del cobro completo por
    // servicio): es una feature de venta del plan, no un beneficio del
    // trial de PayPal.
    const plan = await getActiveBusinessPlan(supabase, body.businessId);
    if (!isProPlan(plan)) {
      return NextResponse.json(
        {
          error:
            "El depósito para garantizar citas es una función del plan Pro. Mejora tu plan para activarlo.",
        },
        { status: 403 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select(
        "deposit_required, deposit_type, deposit_percentage, deposit_fixed_amount"
      )
      .eq("id", body.businessId)
      .maybeSingle();

    if (!business?.deposit_required) {
      return NextResponse.json(
        { error: "Este negocio no requiere depósito para reservar" },
        { status: 400 }
      );
    }

    // C-2: the real service price is loaded from the DB, never trusted from
    // the client. It must belong to this business and be active.
    const { data: service } = await supabase
      .from("services")
      .select("id, name, price, currency, is_active, business_id")
      .eq("id", body.serviceId)
      .eq("business_id", body.businessId)
      .eq("is_active", true)
      .maybeSingle();

    if (!service) {
      return NextResponse.json(
        { error: "El servicio no existe o no pertenece a este negocio" },
        { status: 400 }
      );
    }

    const price = Number(service.price);
    const depositAmountLocal =
      business.deposit_type === "fixed"
        ? Number(business.deposit_fixed_amount)
        : Number(((price * Number(business.deposit_percentage)) / 100).toFixed(2));

    if (!depositAmountLocal || depositAmountLocal <= 0) {
      return NextResponse.json(
        { error: "El monto del depósito configurado es inválido" },
        { status: 400 }
      );
    }

    const amountUsd = Number((depositAmountLocal / conversionRate).toFixed(2));
    if (!amountUsd || amountUsd < MIN_CHARGE_USD) {
      return NextResponse.json(
        {
          error: `El monto a pagar debe ser al menos US$${MIN_CHARGE_USD.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Create checkout session
    const sessionId = randomUUID();
    const cancelToken = randomUUID();

    const { error: sessionError } = await supabase
      .from("payment_sessions")
      .insert({
        id: sessionId,
        business_id: body.businessId,
        service_id: service.id,
        client_name: body.clientName || null,
        client_email: body.clientEmail,
        client_phone: body.clientPhone || null,
        notes: body.notes || null,
        appointment_date: body.appointmentDate,
        start_time: body.startTime,
        end_time: body.endTime,
        cancel_token: cancelToken,
        amount_dop: depositAmountLocal,
        currency: service.currency,
        amount_usd: amountUsd,
        session_type: "deposit",
        client_ip: clientIp !== "unknown" ? clientIp : null,
      });

    if (sessionError) {
      return NextResponse.json(
        { error: genericError("create-deposit: session insert failed", sessionError) },
        { status: 500 }
      );
    }

    // Create PayPal order
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${siteUrl}/paypal-return?session=${sessionId}&business=${body.businessId}`;
    const cancelUrl = `${siteUrl}/paypal-cancel?session=${sessionId}`;

    let order;
    try {
      order = await createPaypalOrder({
        amountUsd,
        customId: sessionId,
        returnUrl,
        cancelUrl,
        description: `Depósito de reserva: ${service.name} (${body.clientName || body.clientEmail})`,
      });
    } catch (err) {
      return NextResponse.json(
        { error: genericError("create-deposit: PayPal order failed", err) },
        { status: 500 }
      );
    }

    // M-1: persist the order id and fail loudly if it doesn't stick — we
    // must never leave a PayPal order created without recording its id.
    const { error: updateError } = await supabase
      .from("payment_sessions")
      .update({ paypal_order_id: order.id })
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        { error: genericError("create-deposit: failed to persist paypal_order_id", updateError) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId,
      orderId: order.id,
      approveUrl: order.approveUrl,
      amountUsd,
      depositAmountLocal,
    });
  } catch (err) {
    return NextResponse.json(
      { error: genericError("create-deposit: unhandled error", err) },
      { status: 500 }
    );
  }
}
