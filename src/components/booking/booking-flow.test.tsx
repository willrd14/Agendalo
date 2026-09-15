import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";

const { assignMock } = vi.hoisted(() => ({ assignMock: vi.fn() }));

vi.mock("@/lib/use-supabase-browser", () => ({
  useSupabaseBrowser: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("service=svc-1"),
}));

import BookingFlow from "@/components/booking/booking-flow";

const business = {
  id: "biz-1",
  name: "Mi Negocio",
  primary_color: "#059669",
  currency: "DOP",
};

const service = {
  id: "svc-1",
  name: "Consulta de equipos",
  description: null,
  duration_minutes: 60,
  price: 1000,
  currency: "DOP",
};

function baseProps(overrides: Record<string, any> = {}) {
  return {
    business,
    services: [service],
    availability: [{ id: "a1", day_of_week: new Date().getDay(), start_time: "09:00", end_time: "12:00" }],
    employees: [],
    token: "tok-1",
    ...overrides,
  };
}

async function goToStep3(overrides: Record<string, any> = {}) {
  render(<BookingFlow {...baseProps(overrides)} />);
  // Select a date (first date button)
  const dateButtons = screen.getAllByRole("button", { name: /de /i });
  fireEvent.click(dateButtons[0]);
  // Select a time
  const timeButton = await screen.findByRole("button", { name: /^09:00$/ });
  fireEvent.click(timeButton);
  // Continue to step 3
  fireEvent.click(screen.getByText("Continuar"));
  await screen.findByText("Tus datos de contacto");
}

beforeEach(() => {
  (toast.success as any).mockClear();
  (toast.error as any).mockClear();
  assignMock.mockClear();
  global.fetch = vi.fn();
  Object.defineProperty(window, "location", {
    value: { assign: assignMock, href: "http://localhost" },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BookingFlow - pago PayPal", () => {
  it("muestra el botón PayPal en step 3 si paypalEnabled es true", async () => {
    await goToStep3({ paypalEnabled: true, paypalConversionRate: 60 });

    const paypalButton = screen.getByText("Pagar ahora con PayPal (USD)");
    expect(paypalButton).toBeInTheDocument();
  });

  it("NO muestra el botón PayPal si paypalEnabled es false", async () => {
    await goToStep3({ paypalEnabled: false });

    expect(
      screen.queryByText("Pagar ahora con PayPal (USD)")
    ).not.toBeInTheDocument();
  });

  it("al hacer clic en PayPal llama a /api/payments/paypal/create y redirige a approveUrl", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ approveUrl: "https://paypal.com/approve" }),
    });

    await goToStep3({ paypalEnabled: true, paypalConversionRate: 60 });

    // Fill required client details
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Cliente Test" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "cliente@example.com" } });

    fireEvent.click(screen.getByText("Pagar ahora con PayPal (USD)"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("/api/payments/paypal/create");
    const body = JSON.parse(opts.body);
    expect(body.businessId).toBe("biz-1");
    expect(body.serviceId).toBe("svc-1");
    expect(body.price).toBe(1000);
    expect(body.currency).toBe("DOP");
    expect(body.conversionRate).toBe(60);
    expect(assignMock).toHaveBeenCalledWith(
      "https://paypal.com/approve"
    );
  });

  it("deshabilita el botón PayPal si falta el email o el nombre", async () => {
    await goToStep3({ paypalEnabled: true, paypalConversionRate: 60 });

    // Sin email ni nombre: botón deshabilitado
    expect(
      screen.getByText("Pagar ahora con PayPal (USD)")
    ).toBeDisabled();
  });
});
