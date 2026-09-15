import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelPaypalSubscription } from "@/lib/paypal";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 400 }
      );
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", business.id)
      .eq("status", "active")
      .maybeSingle();

    if (!sub?.paypal_subscription_id) {
      return NextResponse.json(
        { error: "No hay suscripción activa para cancelar" },
        { status: 400 }
      );
    }

    await cancelPaypalSubscription(sub.paypal_subscription_id);

    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", sub.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al cancelar suscripción";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
