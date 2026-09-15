import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PayPalWebhookPayload {
  event_type: string;
  resource: {
    id: string;
    status?: string;
    amount?: { total: string; currency: string };
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload: PayPalWebhookPayload = await req.json();
    const eventType = payload.event_type ?? "";
    const resource = payload.resource ?? {};
    const subscriptionId = resource.id ?? "";

    if (!subscriptionId) {
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    // Find the subscription by paypal_subscription_id
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("paypal_subscription_id", subscriptionId)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ received: true });
    }

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await supabase
          .from("subscriptions")
          .update({ status: "active" })
          .eq("id", sub.id);
        break;
      case "BILLING.SUBSCRIPTION.CANCELLED":
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("id", sub.id);
        break;
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("id", sub.id);
        break;
      case "BILLING.SUBSCRIPTION.EXPIRED":
        await supabase
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("id", sub.id);
        break;
      case "PAYMENT.SALE.COMPLETED": {
        const amount = resource?.amount?.total;
        const currency = resource?.amount?.currency ?? "USD";
        const txnId = resource?.id ?? "";
        await supabase.from("payments").insert({
          business_id: sub.business_id,
          amount: amount ? Number(amount) : 0,
          currency,
          method: "paypal",
          status: "completed",
          paypal_transaction_id: txnId,
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true, error: "processing error" });
  }
}
