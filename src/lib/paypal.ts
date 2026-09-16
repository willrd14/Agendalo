const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

export const PAYPAL_PLANS = {
  basic: process.env.PAYPAL_PLAN_BASIC_ID!,
  pro: process.env.PAYPAL_PLAN_PRO_ID!,
};

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPaypalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function createPaypalSubscription(
  planId: string,
  customId: string
): Promise<{ id: string; status: string; approveUrl?: string }> {
  const token = await getPaypalAccessToken();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const body = {
    plan_id: planId,
    custom_id: customId,
    application_context: {
      brand_name: "Agendalo",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      payment_method: { payer_selected: "PAYPAL", payee_preferred: "UNRESTRICTED" },
      return_url: `${siteUrl}/billing?success=1`,
      cancel_url: `${siteUrl}/billing?canceled=1`,
    },
  };

  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal create subscription failed: ${res.status} ${JSON.stringify(data)}`);
  }

  const approveLink = data.links?.find(
    (l: { rel: string; href: string }) => l.rel === "approve"
  )?.href;

  return {
    id: data.id as string,
    status: data.status as string,
    approveUrl: approveLink as string | undefined,
  };
}

export async function getPaypalSubscription(
  subscriptionId: string
): Promise<{ status: string; billing_info?: { next_billing_time?: string } }> {
  const token = await getPaypalAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`PayPal get subscription failed: ${res.status}`);
  }
  return res.json();
}

export async function cancelPaypalSubscription(
  subscriptionId: string,
  reason = "Cancelado por el usuario"
): Promise<void> {
  const token = await getPaypalAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal cancel failed: ${res.status} ${text}`);
  }
}

interface CreatePaypalOrderInput {
  amountUsd: number;
  customId: string;
  returnUrl: string;
  cancelUrl: string;
  description?: string;
}

export async function createPaypalOrder({
  amountUsd,
  customId,
  returnUrl,
  cancelUrl,
  description,
}: CreatePaypalOrderInput): Promise<{ id: string; approveUrl?: string }> {
  const token = await getPaypalAccessToken();

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: customId,
        description: description ?? "Pago de reserva",
        amount: {
          currency_code: "USD",
          value: amountUsd.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "Agendalo",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `PayPal create order failed: ${res.status} ${JSON.stringify(data)}`
    );
  }

  const approveLink = data.links?.find(
    (l: { rel: string; href: string }) => l.rel === "approve"
  )?.href;

  return {
    id: data.id as string,
    approveUrl: approveLink as string | undefined,
  };
}

export interface WebhookVerificationHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

/**
 * Verifies a PayPal webhook signature via PayPal's
 * `verify-webhook-signature` endpoint. Returns true only when PayPal
 * confirms `verification_status === "SUCCESS"`. Never throws for a bad
 * signature — callers should treat any non-true result as "reject".
 */
export async function verifyPaypalWebhookSignature(
  headers: WebhookVerificationHeaders,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // Fail closed: without a configured webhook id we cannot verify
    // anything, so we must not trust the payload.
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const token = await getPaypalAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: headers.transmissionId,
      transmission_time: headers.transmissionTime,
      cert_url: headers.certUrl,
      auth_algo: headers.authAlgo,
      transmission_sig: headers.transmissionSig,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  return data?.verification_status === "SUCCESS";
}

export async function capturePaypalOrder(orderId: string): Promise<{
  captureId: string;
  status: string;
  amount: { value: string; currency_code: string };
}> {
  const token = await getPaypalAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `PayPal capture failed: ${res.status} ${JSON.stringify(data)}`
    );
  }

  const unit = data.purchase_units?.[0];
  const capture =
    unit?.payments?.captures?.find(
      (c: { status: string }) => c.status === "COMPLETED"
    ) ?? unit?.payments?.captures?.[0];

  return {
    captureId: capture?.id ?? data.id,
    status: capture?.status ?? data.status,
    amount: capture?.amount ?? { value: "0", currency_code: "USD" },
  };
}
