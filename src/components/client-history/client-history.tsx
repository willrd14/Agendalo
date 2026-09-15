"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  services: { name: string } | null;
  businesses: { name: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: "text-amber-700", bg: "bg-amber-100" },
  confirmed: { label: "Confirmada", color: "text-emerald-700", bg: "bg-emerald-100" },
  cancelled: { label: "Cancelada", color: "text-red-700", bg: "bg-red-100" },
  completed: { label: "Completada", color: "text-blue-700", bg: "bg-blue-100" },
};

export default function ClientHistory({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const today = new Date().toISOString().split("T")[0];

  const upcoming = appointments.filter(
    (a) => a.date >= today && a.status !== "cancelled"
  );
  const past = appointments.filter(
    (a) => a.date < today || a.status === "cancelled" || a.status === "completed"
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Mis citas</h1>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Próximas ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Historial ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No tienes citas próximas. ¿Quieres agendar una?
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcoming.map((appt) => {
                const status = statusConfig[appt.status] ?? statusConfig.pending;
                return (
                  <Card key={appt.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {appt.services?.name ?? "Servicio"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appt.businesses?.name ?? "Negocio"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(
                            new Date(appt.date + "T00:00:00"),
                            "EEEE, d 'de' MMMM",
                            { locale: es }
                          )}{" "}
                          · {appt.start_time} - {appt.end_time}
                        </p>
                      </div>
                      <Badge className={`${status.bg} ${status.color}`}>
                        {status.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {past.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aún no tienes citas anteriores.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {past.map((appt) => {
                const status = statusConfig[appt.status] ?? statusConfig.pending;
                return (
                  <Card key={appt.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {appt.services?.name ?? "Servicio"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appt.businesses?.name ?? "Negocio"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(
                            new Date(appt.date + "T00:00:00"),
                            "EEEE, d 'de' MMMM",
                            { locale: es }
                          )}{" "}
                          · {appt.start_time} - {appt.end_time}
                        </p>
                      </div>
                      <Badge className={`${status.bg} ${status.color}`}>
                        {status.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}