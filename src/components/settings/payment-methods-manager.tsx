"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, CreditCard, Landmark, Lock, ShieldCheck } from "lucide-react";
import type { BusinessPlan } from "@/lib/plans";

export interface PaymentMethod {
  id: string;
  business_id: string;
  type: "paypal" | "transfer";
  is_enabled: boolean;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  transfer_notes: string | null;
  paypal_conversion_rate: number | null;
}

const types: Array<{
  type: "paypal" | "transfer";
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: "paypal",
    title: "PayPal (online)",
    description:
      "Permite a tus clientes pagar en línea con PayPal. Requiere una cuenta PayPal verificada.",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    type: "transfer",
    title: "Transferencia bancaria",
    description:
      "Los clientes pagan por transferencia. Configura los datos de tu cuenta para mostrarlos en la reserva.",
    icon: <Landmark className="h-5 w-5" />,
  },
];

export interface DepositSettings {
  deposit_required: boolean;
  deposit_type: "percentage" | "fixed";
  deposit_percentage: number;
  deposit_fixed_amount: number;
}

export default function PaymentMethodsManager({
  businessId,
  businessCurrency,
  initialMethods,
  plan,
  initialDeposit,
}: {
  businessId: string;
  businessCurrency: string;
  initialMethods: PaymentMethod[];
  plan: BusinessPlan;
  initialDeposit: DepositSettings;
}) {
  const supabase = useSupabaseBrowser();
  const isPro = plan === "pro";
  const [methods, setMethods] = useState<PaymentMethod[]>(
    initialMethods.length > 0
      ? initialMethods
      : [
          { id: "", business_id: businessId, type: "paypal", is_enabled: true, bank_name: null, account_holder: null, account_number: null, transfer_notes: null, paypal_conversion_rate: null },
          { id: "", business_id: businessId, type: "transfer", is_enabled: true, bank_name: null, account_holder: null, account_number: null, transfer_notes: null, paypal_conversion_rate: null },
        ]
  );
  const [deposit, setDeposit] = useState<DepositSettings>(initialDeposit);
  const [loading, setLoading] = useState(false);

  const getMethod = (type: "paypal" | "transfer") =>
    methods.find((m) => m.type === type);

  const updateMethod = (type: "paypal" | "transfer", patch: Partial<PaymentMethod>) => {
    setMethods((prev) =>
      prev.map((m) => (m.type === type ? { ...m, ...patch } : m))
    );
  };

  const save = async () => {
    setLoading(true);
    try {
      for (const method of methods) {
        const { error } = await supabase.from("business_payment_methods").upsert(
          {
            business_id: businessId,
            type: method.type,
            is_enabled: method.is_enabled,
            bank_name: method.bank_name || null,
            account_holder: method.account_holder || null,
            account_number: method.account_number || null,
            transfer_notes: method.transfer_notes || null,
            paypal_conversion_rate: method.paypal_conversion_rate || null,
          },
          { onConflict: "business_id,type" }
        );
        if (error) throw error;
      }

      if (isPro) {
        // A-2: written through a server route that validates plan + value
        // ranges (1-100% / >= 0) instead of a direct client update, which
        // only enforced ownership via RLS.
        const res = await fetch("/api/settings/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deposit_required: deposit.deposit_required,
            deposit_type: deposit.deposit_type,
            deposit_percentage: deposit.deposit_percentage,
            deposit_fixed_amount: deposit.deposit_fixed_amount,
          }),
        });
        const depositResult = await res.json();
        if (!res.ok) {
          throw new Error(depositResult.error ?? "Error al guardar la configuración de depósito");
        }
      }

      toast.success("Métodos de pago guardados");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al guardar métodos de pago";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const transfer = getMethod("transfer");
  const paypal = getMethod("paypal");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métodos de pago</CardTitle>
        <CardDescription>
          Configura cómo deseas recibir los pagos de tus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {types.map(({ type, title, description, icon }) => {
          const method = getMethod(type);
          return (
            <div key={type} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={method?.is_enabled ?? true}
                onClick={() =>
                  updateMethod(type, { is_enabled: !(method?.is_enabled ?? true) })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  method?.is_enabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-card transition-transform ${
                    method?.is_enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}

        {paypal?.is_enabled && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium text-foreground">
              Conversión de moneda para PayPal
            </h3>
            <p className="text-sm text-muted-foreground">
              PayPal no admite {businessCurrency}, así que los pagos online se
              cobran en USD. Indica cuántos {businessCurrency} equivalen a 1 USD
              para calcular el monto a cobrar.
            </p>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="pm-rate">Tasa (DOP por USD)</Label>
              <Input
                id="pm-rate"
                type="number"
                min={0}
                step="0.01"
                value={paypal.paypal_conversion_rate ?? ""}
                placeholder="Ej: 60"
                onChange={(e) =>
                  updateMethod("paypal", {
                    paypal_conversion_rate:
                      e.target.value === ""
                        ? null
                        : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        )}

        {transfer?.is_enabled && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium text-foreground">
              Datos bancarios para transferencia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pm-bank">Nombre del banco</Label>
                <Input
                  id="pm-bank"
                  value={transfer.bank_name ?? ""}
                  placeholder="Ej: Banco Popular"
                  onChange={(e) =>
                    updateMethod("transfer", { bank_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-holder">Titular de la cuenta</Label>
                <Input
                  id="pm-holder"
                  value={transfer.account_holder ?? ""}
                  placeholder="Nombre y apellido"
                  onChange={(e) =>
                    updateMethod("transfer", { account_holder: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-number">Número de cuenta</Label>
                <Input
                  id="pm-number"
                  value={transfer.account_number ?? ""}
                  placeholder="Cuenta o IBAN"
                  onChange={(e) =>
                    updateMethod("transfer", { account_number: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-notes">Instrucciones (opcional)</Label>
              <Textarea
                id="pm-notes"
                value={transfer.transfer_notes ?? ""}
                placeholder="Ej: Envía el comprobante por WhatsApp al 809-000-0000"
                onChange={(e) =>
                  updateMethod("transfer", { transfer_notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
        )}

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Depósito para garantizar citas
                </p>
                <p className="text-sm text-muted-foreground">
                  Exige un depósito online por PayPal antes de confirmar la
                  cita, para reducir inasistencias.
                </p>
              </div>
            </div>
            {!isPro && (
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
                <Lock className="h-3 w-3" /> Plan Pro
              </span>
            )}
          </div>

          {!isPro && (
            <div className="rounded-md border border-accent bg-accent/40 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-accent-foreground">
                El depósito para garantizar citas es una función del{" "}
                <span className="font-medium">plan Pro</span>.
              </p>
              <Link href="/billing">
                <Button size="sm" variant="secondary">Ver plan Pro</Button>
              </Link>
            </div>
          )}

          <div className={`space-y-4 ${!isPro ? "opacity-50 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="deposit-toggle">Requerir depósito</Label>
                <p className="text-sm text-muted-foreground">
                  Solo aplica si PayPal está habilitado arriba; si no, la cita
                  se confirma de forma manual como hoy.
                </p>
              </div>
              <Switch
                id="deposit-toggle"
                checked={deposit.deposit_required}
                onCheckedChange={(checked) =>
                  setDeposit((prev) => ({ ...prev, deposit_required: checked }))
                }
                disabled={!isPro}
              />
            </div>

            {deposit.deposit_required && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="deposit-type">Tipo de depósito</Label>
                  <select
                    id="deposit-type"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={deposit.deposit_type}
                    disabled={!isPro}
                    onChange={(e) =>
                      setDeposit((prev) => ({
                        ...prev,
                        deposit_type: e.target.value as "percentage" | "fixed",
                      }))
                    }
                  >
                    <option value="percentage">Porcentaje del servicio</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {deposit.deposit_type === "percentage" ? (
                    <>
                      <Label htmlFor="deposit-percentage">Porcentaje (%)</Label>
                      <Input
                        id="deposit-percentage"
                        type="number"
                        min={1}
                        max={100}
                        step="1"
                        value={deposit.deposit_percentage}
                        disabled={!isPro}
                        onChange={(e) =>
                          setDeposit((prev) => ({
                            ...prev,
                            deposit_percentage: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </>
                  ) : (
                    <>
                      <Label htmlFor="deposit-fixed">
                        Monto fijo ({businessCurrency})
                      </Label>
                      <Input
                        id="deposit-fixed"
                        type="number"
                        min={0}
                        step="0.01"
                        value={deposit.deposit_fixed_amount}
                        disabled={!isPro}
                        onChange={(e) =>
                          setDeposit((prev) => ({
                            ...prev,
                            deposit_fixed_amount: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={save}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Guardando..." : "Guardar métodos de pago"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
