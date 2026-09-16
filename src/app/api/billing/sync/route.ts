import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPaypalSubscription } from "@/lib/paypal";

const PAYPAL_STATUS_TO_DB: Record<string, string> = {
  ACTIVE: "active",
  APPROVAL_PENDING: "approval_pending",
  APPROVED: "active",
  SUSPENDED: "past_due",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ subscription: null });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let dbStatus = sub?.status ?? null;
    let paypalDetail = null;

    // If there's a paypal subscription id, sync status with PayPal
    if (sub?.paypal_subscription_id) {
      try {
        paypalDetail = await getPaypalSubscription(
          sub.paypal_subscription_id
        );
        const newStatus =
          PAYPAL_STATUS_TO_DB[paypalDetail.status] ?? dbStatus;

        if (newStatus !== dbStatus) {
          const periodEnd = paypalDetail.billing_info?.next_billing_time
            ? new Date(paypalDetail.billing_info.next_billing_time).toISOString()
            : sub.current_period_end;

          // Status is derived from PayPal's own API response, not from
          // client input — but the write itself still goes through the
          // service role since the RLS-enforced client no longer has
          // UPDATE access on `subscriptions` (see C-1 fix).
          await createServiceClient()
            .from("subscriptions")
            .update({ status: newStatus, current_period_end: periodEnd })
            .eq("id", sub.id);
          dbStatus = newStatus;
        }
      } catch {
        // PayPal may not be reachable; keep DB status
      }
    }

    return NextResponse.json({
      subscription: {
        id: sub?.id ?? null,
        plan: sub?.plan ?? null,
        status: dbStatus,
        paypal_subscription_id: sub?.paypal_subscription_id ?? null,
        current_period_start: sub?.current_period_start ?? null,
        current_period_end: sub?.current_period_end ?? null,
      },
      business: { name: business.name },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al consultar suscripción";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
