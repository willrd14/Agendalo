import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createPaypalSubscription,
  PAYPAL_PLANS,
} from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body: { plan?: string } = await req.json();
    const plan = body.plan as "basic" | "pro";

    if (plan !== "basic" && plan !== "pro") {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    const planId = PAYPAL_PLANS[plan];
    if (!planId) {
      return NextResponse.json(
        { error: "Plan no configurado en el servidor" },
        { status: 500 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json(
        { error: "Configura tu negocio primero" },
        { status: 400 }
      );
    }

    const customId = `${business.id}:${user.id}`;

    const subscription = await createPaypalSubscription(planId, customId);

    if (subscription.status !== "APPROVAL_PENDING" && !subscription.approveUrl) {
      return NextResponse.json(
        { error: "No se pudo iniciar la suscripción" },
        { status: 500 }
      );
    }

    // Upsert a pending subscription record
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("business_id", business.id)
      .eq("status", "approval_pending")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("subscriptions")
        .update({
          plan,
          paypal_subscription_id: subscription.id,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({
        business_id: business.id,
        plan,
        status: "approval_pending",
        paypal_subscription_id: subscription.id,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    }

    return NextResponse.json({ approveUrl: subscription.approveUrl });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al iniciar suscripción";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
