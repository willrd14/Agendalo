import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPaypalWebhookSignature } from "@/lib/paypal";

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
    // Read the raw body first: signature verification is computed over the
    // exact bytes PayPal sent, not a re-serialized JSON object.
    const rawBody = await req.text();

    const transmissionId = req.headers.get("paypal-transmission-id");
    const transmissionTime = req.headers.get("paypal-transmission-time");
    const certUrl = req.headers.get("paypal-cert-url");
    const authAlgo = req.headers.get("paypal-auth-algo");
    const transmissionSig = req.headers.get("paypal-transmission-sig");

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      console.error("PayPal webhook: missing verification headers");
      return NextResponse.json({ error: "Missing verification headers" }, { status: 400 });
    }

    const verified = await verifyPaypalWebhookSignature(
      {
        transmissionId,
        transmissionTime,
        certUrl,
        authAlgo,
        transmissionSig,
      },
      rawBody
    );

    if (!verified) {
      console.error("PayPal webhook: signature verification failed");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload: PayPalWebhookPayload = JSON.parse(rawBody);
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
  } catch (err) {
    console.error("PayPal webhook processing error:", err);
    return NextResponse.json({ received: true, error: "processing error" });
  }
}
