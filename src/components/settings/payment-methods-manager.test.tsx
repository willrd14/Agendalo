import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";

const { mockUpsert } = vi.hoisted(() => ({ mockUpsert: vi.fn() }));

vi.mock("@/lib/use-supabase-browser", () => ({
  useSupabaseBrowser: () => ({
    from: () => ({
      upsert: mockUpsert,
    }),
  }),
}));

import PaymentMethodsManager from "@/components/settings/payment-methods-manager";

const businessId = "biz-1";

beforeEach(() => {
  mockUpsert.mockReset();
  (toast.success as any).mockClear();
  (toast.error as any).mockClear();
});

describe("PaymentMethodsManager", () => {
  it("renderiza los dos métodos de pago (PayPal y Transferencia)", () => {
    render(
      <PaymentMethodsManager
        businessId={businessId}
        businessCurrency="DOP"
        initialMethods={[]}
      />
    );

    expect(screen.getByText("PayPal (online)")).toBeInTheDocument();
    expect(screen.getByText("Transferencia bancaria")).toBeInTheDocument();
    expect(screen.getByText("Métodos de pago")).toBeInTheDocument();
  });

  it("muestra el panel de conversión de moneda cuando PayPal está habilitado", () => {
    render(
      <PaymentMethodsManager
        businessId={businessId}
        businessCurrency="DOP"
        initialMethods={[]}
      />
    );

    // Por defecto paypal.is_enabled=true
    expect(screen.getByText(/Conversión de moneda para PayPal/)).toBeInTheDocument();
    expect(screen.getByLabelText("Tasa (DOP por USD)")).toBeInTheDocument();
  });

  it("guarda los métodos llamando a upsert para cada tipo", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    render(
      <PaymentMethodsManager
        businessId={businessId}
        businessCurrency="DOP"
        initialMethods={[]}
      />
    );

    fireEvent.click(screen.getByText("Guardar métodos de pago"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });
    expect(toast.success).toHaveBeenCalledWith("Métodos de pago guardados");
  });

  it("muestra error de toast si upsert falla", async () => {
    mockUpsert.mockResolvedValue({ error: new Error("RLS bloqueado") });

    render(
      <PaymentMethodsManager
        businessId={businessId}
        businessCurrency="DOP"
        initialMethods={[]}
      />
    );

    fireEvent.click(screen.getByText("Guardar métodos de pago"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("guarda la tasa de conversión ingresada", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    render(
      <PaymentMethodsManager
        businessId={businessId}
        businessCurrency="DOP"
        initialMethods={[]}
      />
    );

    const rateInput = screen.getByLabelText("Tasa (DOP por USD)");
    fireEvent.change(rateInput, { target: { value: "60" } });
    fireEvent.click(screen.getByText("Guardar métodos de pago"));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
    });
    const calls = mockUpsert.mock.calls;
    const paypalInsert = calls.find((c) => c[0]!.type === "paypal");
    expect(paypalInsert?.[0]!.paypal_conversion_rate).toBe(60);
  });
});
