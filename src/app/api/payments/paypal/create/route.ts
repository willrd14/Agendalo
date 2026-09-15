import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createPaypalOrder } from "@/lib/paypal";
import { getPayPalEligibility } from "@/lib/plans";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

interface CreateRequest {
  businessId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  currency: string;
  conversionRate: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  notes?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  requestId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateRequest;

    if (
      !body.businessId ||
      !body.serviceId ||
      !body.price ||
      !body.clientEmail ||
      !body.appointmentDate ||
      !body.startTime ||
      !body.endTime
    ) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (!body.conversionRate || body.conversionRate <= 0) {
      return NextResponse.json(
        { error: "Tipo de cambio no configurado" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

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

    // El cobro online por PayPal es feature exclusiva de Pro (o prueba gratuita).
    const { data: business } = await supabase
      .from("businesses")
      .select("id, created_at")
      .eq("id", body.businessId)
      .maybeSingle();

    const eligibility = await getPayPalEligibility(
      supabase,
      business ?? { id: body.businessId }
    );
    if (!eligibility.allowed) {
      return NextResponse.json(
        {
          error:
            "El pago online por PayPal es una función del plan Pro. Mejora tu plan para activarlo.",
        },
        { status: 403 }
      );
    }

    const amountUsd = Number(
      (Number(body.price) / body.conversionRate).toFixed(2)
    );
    if (amountUsd <= 0) {
      return NextResponse.json(
        { error: "El monto a pagar es inválido" },
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
        service_id: body.serviceId,
        client_name: body.clientName || null,
        client_email: body.clientEmail,
        client_phone: body.clientPhone || null,
        notes: body.notes || null,
        appointment_date: body.appointmentDate,
        start_time: body.startTime,
        end_time: body.endTime,
        cancel_token: cancelToken,
        amount_dop: body.price,
        currency: body.currency,
        amount_usd: amountUsd,
      });

    if (sessionError) {
      return NextResponse.json(
        { error: `Error al iniciar la sesión: ${sessionError.message}` },
        { status: 500 }
      );
    }

    // Create PayPal order
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${siteUrl}/paypal-return?session=${sessionId}&business=${body.businessId}`;
    const cancelUrl = `${siteUrl}/paypal-cancel?session=${sessionId}`;

    const order = await createPaypalOrder({
      amountUsd,
      customId: sessionId,
      returnUrl,
      cancelUrl,
      description: `Reserva: ${body.serviceName} (${body.clientName || body.clientEmail})`,
    });

    // Store the order id on the session
    await supabase
      .from("payment_sessions")
      .update({ paypal_order_id: order.id })
      .eq("id", sessionId);

    return NextResponse.json({
      sessionId,
      orderId: order.id,
      approveUrl: order.approveUrl,
      amountUsd,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al iniciar el pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
