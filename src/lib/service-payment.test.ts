import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockCapture, mockCreateUser, fromImpl } = vi.hoisted(() => {
  return {
    mockCapture: vi.fn(),
    mockCreateUser: vi.fn(),
    fromImpl: { current: null as null | ((table: string) => any) },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (fromImpl.current) return fromImpl.current(table);
      return {};
    },
    auth: { admin: { createUser: mockCreateUser } },
  }),
}));

vi.mock("@/lib/paypal", () => ({
  capturePaypalOrder: mockCapture,
}));

import { finalizePaypalPayment } from "@/lib/service-payment";

const session = {
  id: "sess-1",
  status: "pending",
  paypal_order_id: "ORD-X",
  business_id: "biz-1",
  service_id: "svc-1",
  client_email: "cliente@example.com",
  client_name: "Cliente Test",
  appointment_date: "2026-09-15",
  start_time: "10:00",
  end_time: "11:00",
  notes: "nota",
  cancel_token: "tok",
  amount_usd: 16.67,
};

function makeBuilder(handlers: Record<string, any>) {
  return (table: string) => {
    const h = handlers[table];
    const q: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      insert: vi.fn(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    if (h) {
      if (h.maybeSingle) q.maybeSingle.mockImplementation(h.maybeSingle);
      if (h.insert) {
        q.insert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(h.insert),
        });
      }
      if (h.update) {
        q.update = vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(h.update),
        });
      }
    }
    return q;
  };
}

function setQueries(handlers: Record<string, any>) {
  fromImpl.current = makeBuilder(handlers);
}

beforeEach(() => {
  mockCapture.mockReset();
  mockCreateUser.mockReset();
  fromImpl.current = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("finalizePaypalPayment", () => {
  it("devuelve error si la sesión no existe", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    });

    const result = await finalizePaypalPayment("no-existe", "ORD-X");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no encontrada/);
  });

  it("es idempotente si ya está completado", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...session, status: "completed" },
          error: null,
        }),
      },
    });

    const result = await finalizePaypalPayment("sess-1", "ORD-X");
    expect(result.success).toBe(true);
    expect(result.alreadyCompleted).toBe(true);
  });

  it("rechaza si el orderId no coincide", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...session, paypal_order_id: "ORD-OTRA" },
          error: null,
        }),
      },
    });

    const result = await finalizePaypalPayment("sess-1", "ORD-X");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no coincide/);
  });

  it("propaga error si el capture falla", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
      },
    });
    mockCapture.mockRejectedValueOnce(new Error("PayPal capture failed: 422"));

    const result = await finalizePaypalPayment("sess-1", "ORD-X");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/PayPal/);
  });

  it("crea cita + pago + marca sesión completada (cliente existente)", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      users: {
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "client-1" }, error: null }),
      },
      services: {
        maybeSingle: vi.fn().mockResolvedValue({
          data: { name: "Consulta de equipos" },
          error: null,
        }),
      },
      appointments: {
        insert: vi.fn().mockResolvedValue({ data: { id: "appt-1" }, error: null }),
      },
      payments: {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    });

    mockCapture.mockResolvedValueOnce({
      captureId: "CAP-123",
      status: "COMPLETED",
      amount: { value: "16.67", currency_code: "USD" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn() }));

    const result = await finalizePaypalPayment("sess-1", "ORD-X");

    expect(result.success).toBe(true);
    expect(result.appointmentId).toBe("appt-1");
    expect(result.paidAmount).toBe(16.67);
    expect(mockCapture).toHaveBeenCalledWith("ORD-X");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("crea el usuario cliente vía admin si no existe", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      users: {
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      services: {
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Consulta" }, error: null }),
      },
      appointments: {
        insert: vi.fn().mockResolvedValue({ data: { id: "appt-2" }, error: null }),
      },
      payments: {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    });

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "new-user-1" } },
      error: null,
    });
    mockCapture.mockResolvedValueOnce({
      captureId: "CAP-2",
      status: "COMPLETED",
      amount: { value: "16.67", currency_code: "USD" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const result = await finalizePaypalPayment("sess-1", "ORD-X");

    expect(result.success).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
  });
});
