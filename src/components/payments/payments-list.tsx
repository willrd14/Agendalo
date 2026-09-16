"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Wallet,
  CheckCircle2,
  Clock,
  List,
  TrendingUp,
  Download,
  FileText,
  Lock,
} from "lucide-react";
import type { BusinessPlan } from "@/lib/plans";

export interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  method: "paypal" | "transfer";
  status: string;
  paypal_transaction_id: string | null;
  /** True when this payment was a deposit, not the full service price (QA-7). */
  is_deposit: boolean;
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
  plan,
}: {
  payments: PaymentRow[];
  stats: PaymentStats;
  defaultCurrency: string;
  plan: BusinessPlan;
}) {
  const isPro = plan === "pro";
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

  const buildExportRows = () =>
    filtered.map((p) => ({
      service: p.appointments?.services?.name ?? "—",
      date: format(new Date(p.created_at), "d 'de' MMMM, yyyy", { locale: es }),
      amount: `${Number(p.amount).toFixed(2)} ${p.currency}`,
      type: p.is_deposit ? "Depósito" : "Pago completo",
      method: methodLabel[p.method] ?? p.method,
      status: statusConfig[p.status]?.label ?? p.status,
      reference: p.paypal_transaction_id ?? "—",
    }));

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeCsvField = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const exportCsv = () => {
    if (!isPro) return;
    const rows = buildExportRows();
    const headers = ["Servicio", "Fecha", "Monto", "Tipo", "Método", "Estado", "Referencia"];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [r.service, r.date, r.amount, r.type, r.method, r.status, r.reference]
          .map((field) => escapeCsvField(String(field)))
          .join(",")
      ),
    ];
    const csvContent = "﻿" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const filename = `agendalo-pagos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    downloadBlob(blob, filename);
  };

  const exportPdf = async () => {
    if (!isPro) return;
    const [{ default: jsPDF }, { autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Reporte de pagos — Agendalo", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Generado el ${format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}`,
      14,
      25
    );

    const rows = buildExportRows();
    autoTable(doc, {
      startY: 32,
      head: [["Servicio", "Fecha", "Monto", "Tipo", "Método", "Estado", "Referencia"]],
      body: rows.map((r) => [r.service, r.date, r.amount, r.type, r.method, r.status, r.reference]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    const filename = `agendalo-pagos-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
  };

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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Historial de pagos</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {!isPro && (
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">
                  <Lock className="h-3 w-3" /> Plan Pro
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={exportCsv}
                disabled={!isPro || filtered.length === 0}
                title={!isPro ? "Los reportes exportables son una función del plan Pro" : undefined}
              >
                <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportPdf}
                disabled={!isPro || filtered.length === 0}
                title={!isPro ? "Los reportes exportables son una función del plan Pro" : undefined}
              >
                <FileText className="mr-1.5 h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </div>
          {!isPro && (
            <div className="rounded-md border border-accent bg-accent/40 px-4 py-3 flex items-center justify-between gap-4 flex-wrap mt-2">
              <p className="text-sm text-accent-foreground">
                Exportar reportes en PDF y CSV es una función del <span className="font-medium">plan Pro</span>.
              </p>
              <Link href="/billing">
                <Button size="sm" variant="secondary">Ver plan Pro</Button>
              </Link>
            </div>
          )}
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
                    <th className="pb-3 pr-4">Tipo</th>
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
                      <td className="py-3 pr-4">
                        {p.is_deposit ? (
                          <Badge className="bg-blue-100 text-blue-700">Depósito</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Pago completo</span>
                        )}
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
