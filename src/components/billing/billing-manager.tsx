"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Sparkles, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Plan = "basic" | "pro";

interface Subscription {
  id: string | null;
  plan: Plan | null;
  status: string | null;
  paypal_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

const plans: {
  id: Plan;
  name: string;
  usdPrice: string;
  dopPrice: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: "basic",
    name: "Basic",
    usdPrice: "$10",
    dopPrice: "RD$500",
    tagline: "Para negocios que empiezan",
    features: [
      "Hasta 50 citas por mes",
      "Página pública personalizada",
      "Confirmaciones por email",
      "Recordatorios por email (24h)",
      "1 negocio",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    usdPrice: "$20",
    dopPrice: "RD$1,000",
    tagline: "Para negocios en crecimiento",
    highlight: true,
    features: [
      "Citas ilimitadas",
      "Recordatorios por SMS (opcional)",
      "Historial de clientes avanzado",
      "Soporte prioritario",
      "Sin comisión por reserva",
      "Múltiples servicios ilimitados",
    ],
  },
];

const statusLabel: Record<string, { label: string; className: string }> = {
  active: { label: "Activa", className: "bg-emerald-100 text-emerald-700" },
  approval_pending: {
    label: "Pendiente de aprobación",
    className: "bg-amber-100 text-amber-700",
  },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-700" },
  past_due: { label: "Pago pendiente", className: "bg-orange-100 text-orange-700" },
  expired: { label: "Expirada", className: "bg-muted text-muted-foreground" },
};

export default function BillingManager() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [starting, setStarting] = useState<Plan | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadSubscription = useCallback(() => {
    return fetch("/api/billing/sync", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setSubscription(data.subscription);
      })
      .catch(() => {});
  }, []);

  // On mount + when returning from PayPal with a subscription id
  useEffect(() => {
    const subscriptionId = searchParams.get("subscription_id");
    if (searchParams.get("success") && subscriptionId) {
      toast.success("Suscripción activada correctamente 🎉");
      window.history.replaceState({}, "", "/billing");
    } else if (searchParams.get("canceled")) {
      toast.info("Se canceló el proceso de suscripción");
      window.history.replaceState({}, "", "/billing");
    }
    loadSubscription();
  }, [searchParams, loadSubscription]);

  const startSubscription = async (plan: Plan) => {
    setStarting(plan);
    try {
      const res = await fetch("/api/billing/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al iniciar suscripción");

      if (data.approveUrl) {
        // Redirect to PayPal approval
        window.location.assign(data.approveUrl as string);
        return;
      }
      toast.error("No se obtuvo la URL de aprobación");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar suscripción";
      toast.error(message);
    } finally {
      setStarting(null);
    }
  };

  const cancelSubscription = async () => {
    if (!confirm("¿Seguro que deseas cancelar tu suscripción?")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cancelar");
      toast.success("Suscripción cancelada");
      loadSubscription();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cancelar";
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const activePlan = subscription?.plan;
  const isActive =
    subscription?.status === "active" || subscription?.status === "past_due";

  return (
    <div className="space-y-8">
      {/* Current plan status */}
      {activePlan && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Plan {activePlan === "pro" ? "Pro" : "Basic"}
                  </CardTitle>
                  <CardDescription>
                    {subscription.status
                      ? statusLabel[subscription.status]?.label ??
                        subscription.status
                      : ""}
                  </CardDescription>
                </div>
              </div>
              <Badge
                className={
                  statusLabel[subscription.status ?? ""]?.className ??
                  "bg-muted text-foreground/80"
                }
              >
                {statusLabel[subscription.status ?? ""]?.label ??
                  subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              {subscription.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Renueva el{" "}
                  <strong>
                    {format(
                      new Date(subscription.current_period_end),
                      "d 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </strong>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Gestionado por PayPal · {subscription.paypal_subscription_id}
              </p>
            </div>
            {isActive && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200"
                onClick={cancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? "Cancelando..." : "Cancelar suscripción"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {isActive ? "Cambiar de plan" : "Elige tu plan"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isCurrent = activePlan === plan.id && isActive;
            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.highlight
                    ? "border-emerald-500 ring-2 ring-emerald-200"
                    : ""
                }`}
              >
                {plan.highlight && (
                  <Badge className="absolute top-4 right-4 bg-primary text-white">
                    <Sparkles className="mr-1 h-3 w-3" /> Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.usdPrice}
                    </span>
                    <span className="text-muted-foreground">USD / mes</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    ≈ {plan.dopPrice} (facturado en USD)
                  </p>
                  <ul className="space-y-2 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button disabled className="w-full">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Tu plan actual
                    </Button>
                  ) : isActive ? (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => startSubscription(plan.id)}
                      disabled={starting !== null}
                    >
                      {starting === plan.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Cambiar a {plan.name}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => startSubscription(plan.id)}
                      disabled={starting !== null}
                    >
                      {starting === plan.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Empezar con {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Los pagos se procesan de forma segura a través de PayPal. Al
          suscribirte aceptas los términos de la facturación recurrente mensual.
        </p>
      </div>
    </div>
  );
}
