"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, CheckCircle2, Clock, List, TrendingUp } from "lucide-react";

export interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  method: "paypal" | "transfer";
  status: string;
  paypal_transaction_id: string | null;
  created_at: string;
  appointment_id: string | null;
  appointments: {
    start_time: string;
    date: string;
    services: { name: string } | null;
  } | null;
}

export interface PaymentStats {
  total: number;
  completedCount: number;
  pendingCount: number;
  count: number;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  completed: { label: "Completado", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
  failed: { label: "Fallido", className: "bg-red-100 text-red-700" },
  refunded: { label: "Reembolsado", className: "bg-muted text-muted-foreground" },
};

const methodLabel: Record<string, string> = {
  paypal: "PayPal",
  transfer: "Transferencia",
};

export default function PaymentsList({
  payments,
  stats,
  defaultCurrency,
}: {
  payments: PaymentRow[];
  stats: PaymentStats;
  defaultCurrency: string;
}) {
  const [filter, setFilter] = useState<"all" | string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.paypal_transaction_id?.toLowerCase().includes(q) ||
        p.appointments?.services?.name?.toLowerCase().includes(q) ||
        format(new Date(p.created_at), "dd/MM/yyyy").includes(q)
      );
    });
  }, [payments, filter, search]);

  const currency = payments[0]?.currency ?? defaultCurrency;

  const metricCards = [
    {
      label: "Ingresos totales",
      value: `${stats.total.toFixed(2)} ${currency}`,
      icon: <TrendingUp className="h-5 w-5" />,
      className: "bg-primary",
    },
    {
      label: "Pagos completados",
      value: String(stats.completedCount),
      icon: <CheckCircle2 className="h-5 w-5" />,
      className: "bg-emerald-500",
    },
    {
      label: "Pendientes",
      value: String(stats.pendingCount),
      icon: <Clock className="h-5 w-5" />,
      className: "bg-amber-500",
    },
    {
      label: "Total registros",
      value: String(stats.count),
      icon: <List className="h-5 w-5" />,
      className: "bg-blue-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${m.className} text-white flex items-center justify-center`}
                >
                  {m.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-xl font-bold text-foreground">{m.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {cfg.label}
            </Button>
          ))}
        </div>
        <Input
          className="md:w-64"
          placeholder="Buscar por servicio, transacción o fecha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>No hay pagos registrados.</p>
              <p className="text-sm">
                Marca una cita como completada y usa el botón Registrar pago
                desde la sección Citas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Servicio</th>
                    <th className="pb-3 pr-4">Fecha</th>
                    <th className="pb-3 pr-4">Monto</th>
                    <th className="pb-3 pr-4">Método</th>
                    <th className="pb-3 pr-4">Estado</th>
                    <th className="pb-3">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {p.appointments?.services?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {format(new Date(p.created_at), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-foreground">
                        {Number(p.amount).toFixed(2)} {p.currency}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {methodLabel[p.method] ?? p.method}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusConfig[p.status]?.className}>
                          {statusConfig[p.status]?.label ?? p.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {p.paypal_transaction_id
                          ? p.paypal_transaction_id
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
