import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockCapture, mockCreateUser, mockSendEmail, fromImpl } = vi.hoisted(() => {
  return {
    mockCapture: vi.fn(),
    mockCreateUser: vi.fn(),
    mockSendEmail: vi.fn(),
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

vi.mock("@/lib/resend/send-email", () => ({
  sendEmail: mockSendEmail,
}));

import { finalizePaypalPayment } from "@/lib/service-payment";

// Far enough in the future that "past appointment" / "expired session"
// checks never trigger unless a test explicitly overrides them.
const futureDate = "2099-01-15";

const session = {
  id: "sess-1",
  status: "pending",
  paypal_order_id: "ORD-X",
  business_id: "biz-1",
  service_id: "svc-1",
  client_email: "cliente@example.com",
  client_name: "Cliente Test",
  appointment_date: futureDate,
  start_time: "10:00",
  end_time: "11:00",
  notes: "nota",
  cancel_token: "tok",
  amount_usd: 16.67,
  amount_dop: 1000,
  currency: "DOP",
  session_type: "full",
  expires_at: "2099-01-15T09:00:00.000Z",
};

function makeQuery(handlers: Record<string, any> | undefined) {
  const q: any = {};
  const chain = (returnValue: any) => vi.fn().mockReturnValue(returnValue);
  q.select = chain(q);
  q.eq = chain(q);
  q.in = chain(q);
  q.lt = chain(q);
  q.gt = chain(q);
  q.order = chain(q);

  // Terminal methods resolve to { data, error }. Default to "no overlap /
  // no rows" so tests that don't care about the overlap check keep passing.
  q.limit = vi.fn().mockResolvedValue(
    handlers?.limit ? undefined : { data: [], error: null }
  );
  if (handlers?.limit) {
    q.limit = vi.fn().mockImplementation(handlers.limit);
  }

  q.maybeSingle = handlers?.maybeSingle
    ? vi.fn().mockImplementation(handlers.maybeSingle)
    : vi.fn().mockResolvedValue({ data: null, error: null });

  q.insert = handlers?.insert
    ? vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(handlers.insert),
      })
    : vi.fn().mockResolvedValue({ data: null, error: null });

  q.update = handlers?.update
    ? vi.fn().mockReturnValue({ eq: vi.fn().mockImplementation(handlers.update) })
    : vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

  q.single = vi.fn();

  return q;
}

function makeBuilder(handlers: Record<string, any>) {
  return (table: string) => makeQuery(handlers[table]);
}

function setQueries(handlers: Record<string, any>) {
  fromImpl.current = makeBuilder(handlers);
}

beforeEach(() => {
  mockCapture.mockReset();
  mockCreateUser.mockReset();
  mockSendEmail.mockReset();
  mockSendEmail.mockResolvedValue({ ok: true, data: { id: "email-1" } });
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

  it("rechaza si paypal_order_id es null (M-1: sin excepción por NULL)", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...session, paypal_order_id: null },
          error: null,
        }),
      },
    });

    const result = await finalizePaypalPayment("sess-1", "ORD-X");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no coincide/);
  });

  it("rechaza si la sesión de pago ya expiró (M-5)", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...session, expires_at: "2000-01-01T00:00:00.000Z" },
          error: null,
        }),
      },
    });

    const result = await finalizePaypalPayment("sess-1", "ORD-X");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/expir/);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("rechaza si la fecha de la cita ya pasó (M-4)", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...session, appointment_date: "2000-01-01" },
          error: null,
        }),
      },
    });

    const result = await finalizePaypalPayment("sess-1", "ORD-X");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/pasó/);
  });

  it("rechaza si ya existe una cita solapada (M-4)", async () => {
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
      },
      appointments: {
        limit: vi.fn().mockResolvedValue({ data: [{ id: "existing-appt" }], error: null }),
      },
    });

    const result = await finalizePaypalPayment("sess-1", "ORD-X");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/horario/);
    expect(mockCapture).not.toHaveBeenCalled();
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
    expect(result.error).toMatch(/No se pudo procesar el pago/);
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
      businesses: {
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Mi Negocio" }, error: null }),
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

    const result = await finalizePaypalPayment("sess-1", "ORD-X");

    expect(result.success).toBe(true);
    expect(result.appointmentId).toBe("appt-1");
    expect(result.paidAmount).toBe(16.67);
    expect(mockCapture).toHaveBeenCalledWith("ORD-X");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
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
      businesses: {
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Mi Negocio" }, error: null }),
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

    const result = await finalizePaypalPayment("sess-1", "ORD-X");

    expect(result.success).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
  });

  it("marca la sesión como failed si la cita no se pudo crear tras capturar el pago (M-2 best-effort)", async () => {
    const updateSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    setQueries({
      payment_sessions: {
        maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
        update: updateSpy,
      },
      users: {
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "client-1" }, error: null }),
      },
      services: {
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Consulta" }, error: null }),
      },
      businesses: {
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Mi Negocio" }, error: null }),
      },
      appointments: {
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } }),
      },
    });

    mockCapture.mockResolvedValueOnce({
      captureId: "CAP-3",
      status: "COMPLETED",
      amount: { value: "16.67", currency_code: "USD" },
    });

    const result = await finalizePaypalPayment("sess-1", "ORD-X");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No se pudo procesar el pago/);
    expect(updateSpy).toHaveBeenCalled();
  });
});
