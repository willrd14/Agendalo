"use client";

import { useState } from "react";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X, CheckCheck, CalendarDays, DollarSign, Banknote } from "lucide-react";

type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";

interface Service {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
}

type DepositStatus = "unpaid" | "paid" | "refunded";

interface Appointment {
  id: string;
  business_id: string;
  service_id: string;
  client_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  services: Service | null;
  users: Client | null;
  deposit_amount: number | null;
  deposit_status: DepositStatus | null;
}

const statusConfig: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pendiente", color: "text-amber-700", bg: "bg-amber-100" },
  confirmed: {
    label: "Confirmada",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  cancelled: { label: "Cancelada", color: "text-red-700", bg: "bg-red-100" },
  completed: {
    label: "Completada",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
};

const statusOrder: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

const depositStatusConfig: Record<
  DepositStatus,
  { label: string; className: string }
> = {
  paid: { label: "Depósito pagado", className: "bg-emerald-100 text-emerald-700" },
  unpaid: { label: "Depósito pendiente", className: "bg-amber-100 text-amber-700" },
  refunded: { label: "Depósito reembolsado", className: "bg-muted text-muted-foreground" },
};

export default function AppointmentsManager({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const supabase = useSupabaseBrowser();
  const [appointments, setAppointments] = useState<Appointment[]>(
    initialAppointments
  );
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");
  const [search, setSearch] = useState("");

  const updateStatus = async (
    appointment: Appointment,
    status: AppointmentStatus
  ) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointment.id);

      if (error) throw error;
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? { ...a, status } : a))
      );
      toast.success(`Cita ${statusConfig[status].label.toLowerCase()}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar cita";
      toast.error(message);
    }
  };

  // QA-5: the "refunded" deposit status was previously unreachable — there
  // was no UI action to set it, only 'unpaid' -> 'paid' via the online
  // deposit flow. This is a manual action (not automatic on cancel) since
  // the actual refund happens outside Agendalo (PayPal dashboard); we just
  // let the owner record that it happened.
  const markDepositRefunded = async (appointment: Appointment) => {
    const confirmed = window.confirm(
      "¿Confirmas que ya reembolsaste el depósito de esta cita por PayPal? Esto solo actualiza el registro, no procesa el reembolso."
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ deposit_status: "refunded" })
        .eq("id", appointment.id);

      if (error) throw error;
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointment.id ? { ...a, deposit_status: "refunded" } : a
        )
      );
      toast.success("Depósito marcado como reembolsado");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar el depósito";
      toast.error(message);
    }
  };

  const registerPayment = async (appointment: Appointment) => {
    const price = Number(appointment.services?.price);
    if (!price && price !== 0) {
      toast.error("Este servicio no tiene un precio definido");
      return;
    }
    const amount = window.prompt(
      `Monto del pago en ${appointment.services?.currency ?? "DOP"}?`,
      String(price)
    );
    if (!amount) return;

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error("Monto inválido");
      return;
    }

    try {
      const { error } = await supabase.from("payments").insert({
        business_id: appointment.business_id,
        appointment_id: appointment.id,
        amount: parsedAmount,
        currency: appointment.services?.currency ?? "DOP",
        method: "transfer",
        status: "completed",
      });

      if (error) throw error;
      toast.success("Pago registrado correctamente");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al registrar pago";
      toast.error(message);
    }
  };

  const filtered = appointments
    .filter((a) => (filter === "all" ? true : a.status === filter))
    .filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
      a.users?.full_name?.toLowerCase().includes(q) ||
      a.users?.email?.toLowerCase().includes(q) ||
        a.services?.name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Sort by date & time, pending/confirmed first
      const aKey = `${a.date} ${a.start_time}`;
      const bKey = `${b.date} ${b.start_time}`;
      return aKey.localeCompare(bKey);
    });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
          {statusOrder.map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {statusConfig[status].label}
            </Button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente o servicio..."
          className="md:w-64"
        />
      </div>

      {/* Appointments list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {search || filter !== "all"
                ? "No hay citas que coincidan con tu búsqueda."
                : "Aún no tienes citas. Cuando tus clientes reserven, aparecerán aquí."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((appointment) => {
            const status = statusConfig[appointment.status];
            const isPending = appointment.status === "pending";
            const isActive =
              appointment.status === "pending" ||
              appointment.status === "confirmed";

            return (
              <Card key={appointment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {appointment.services?.name ?? "Servicio"}
                      </CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-1">
                          {format(
                            new Date(appointment.date + "T00:00:00"),
                            "EEEE, d 'de' MMMM",
                            { locale: es }
                          )}{" "}
                          · {appointment.start_time} - {appointment.end_time}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={`${status.bg} ${status.color}`}>
                        {status.label}
                      </Badge>
                      {appointment.deposit_amount != null &&
                        appointment.deposit_amount > 0 &&
                        appointment.deposit_status && (
                          <Badge
                            className={
                              depositStatusConfig[appointment.deposit_status].className
                            }
                          >
                            {depositStatusConfig[appointment.deposit_status].label}
                          </Badge>
                        )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {appointment.users?.full_name ?? "Cliente"}
                      </p>
                      {appointment.users?.email && (
                        <p className="text-sm text-muted-foreground">
                          {appointment.users.email}
                        </p>
                      )}
                    </div>
                  </div>
                  {appointment.notes && (
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md mb-3">
                      📝 {appointment.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isActive && (
                      <>
                        {isPending && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 flex-1"
                            onClick={() =>
                              updateStatus(appointment, "confirmed")
                            }
                          >
                            <Check className="mr-1 h-4 w-4" /> Confirmar
                          </Button>
                        )}
                        {appointment.status === "confirmed" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 flex-1"
                            onClick={() =>
                              updateStatus(appointment, "completed")
                            }
                          >
                            <CheckCheck className="mr-1 h-4 w-4" /> Completar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() =>
                            updateStatus(appointment, "cancelled")
                          }
                        >
                          <X className="mr-1 h-4 w-4" /> Cancelar
                        </Button>
                      </>
                    )}
                    {appointment.status === "completed" && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 flex-1"
                        onClick={() => registerPayment(appointment)}
                      >
                        <DollarSign className="mr-1 h-4 w-4" /> Registrar pago
                      </Button>
                    )}
                    {appointment.status === "cancelled" &&
                      appointment.deposit_status === "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => markDepositRefunded(appointment)}
                        >
                          <Banknote className="mr-1 h-4 w-4" /> Marcar depósito
                          como reembolsado
                        </Button>
                      )}
                    {appointment.status !== "pending" &&
                      appointment.status !== "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus(appointment, "pending")
                          }
                          className="flex-1"
                        >
                          Reactivar como pendiente
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
