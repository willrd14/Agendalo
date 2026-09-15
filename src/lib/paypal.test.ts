import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function jsonResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as any;
}

async function freshPaypal() {
  vi.resetModules();
  vi.stubEnv("PAYPAL_ENV", "sandbox");
  vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");
  return import("@/lib/paypal");
}

beforeEach(() => {
  vi.unstubAllGlobals();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createPaypalOrder", () => {
  it("construye la orden en USD y devuelve id y approveUrl", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "TOKEN", expires_in: 3600 })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "ORD-1",
          status: "CREATED",
          links: [
            { rel: "approve", href: "https://paypal.com/approve?token=ORD-1" },
          ],
        })
      );

    const paypal = await freshPaypal();
    const result = await paypal.createPaypalOrder({
      amountUsd: 16.67,
      customId: "sess-1",
      returnUrl: "http://localhost:3000/paypal-return?sessionId=sess-1",
      cancelUrl: "http://localhost:3000/paypal-cancel",
      description: "Pago de reserva",
    });

    expect(result.id).toBe("ORD-1");
    expect(result.approveUrl).toBe("https://paypal.com/approve?token=ORD-1");

    const [, ordersCall] = (global.fetch as any).mock.calls;
    const ordersUrl = ordersCall[0];
    const ordersBody = JSON.parse(ordersCall[1].body);
    expect(ordersUrl).toContain("api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(ordersBody.intent).toBe("CAPTURE");
    expect(ordersBody.purchase_units[0].amount).toEqual({
      currency_code: "USD",
      value: "16.67",
    });
    expect(ordersBody.purchase_units[0].reference_id).toBe("sess-1");
  });

  it("lanza error descriptivo si PayPal devuelve error", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "TOKEN2", expires_in: 3600 })
      )
      .mockResolvedValueOnce(jsonResponse({ name: "CURRENCY_NOT_SUPPORTED" }, 422));

    const paypal = await freshPaypal();
    await expect(
      paypal.createPaypalOrder({
        amountUsd: 10,
        customId: "x",
        returnUrl: "u",
        cancelUrl: "c",
      })
    ).rejects.toThrow(/PayPal create order failed: 422/);
  });
});

describe("capturePaypalOrder", () => {
  it("extrae captureId, estado y monto de la respuesta", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "TOKEN3", expires_in: 3600 })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "ORD-1",
          status: "COMPLETED",
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: "CAP-123",
                    status: "COMPLETED",
                    amount: { value: "16.67", currency_code: "USD" },
                  },
                ],
              },
            },
          ],
        })
      );

    const paypal = await freshPaypal();
    const result = await paypal.capturePaypalOrder("ORD-1");

    expect(result.captureId).toBe("CAP-123");
    expect(result.status).toBe("COMPLETED");
    expect(result.amount).toEqual({ value: "16.67", currency_code: "USD" });
  });

  it("lanza error si el capture no es OK", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "TOKEN4", expires_in: 3600 })
      )
      .mockResolvedValueOnce(jsonResponse({ name: "ORDER_NOT_APPROVED" }, 422));

    const paypal = await freshPaypal();
    await expect(paypal.capturePaypalOrder("ORD-1")).rejects.toThrow(
      /PayPal capture failed: 422/
    );
  });
});
