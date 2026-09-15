"use client";

import { useState } from "react";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";

interface Appointment {
  id: string;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  services: { name: string } | null;
  businesses: { name: string } | null;
}

export default function CancelAppointment({
  appointment,
}: {
  appointment: Appointment;
}) {
  const supabase = useSupabaseBrowser();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(
    appointment.status === "cancelled"
  );

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancellation_reason: reason || null })
        .eq("id", appointment.id);

      if (error) throw error;
      setCancelled(true);
      toast.success("Cita cancelada correctamente");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cancelar la cita";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (cancelled) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <CalendarX2 className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Cita cancelada</CardTitle>
            <CardDescription>
              Tu cita con{" "}
              <strong>{appointment.businesses?.name ?? "el negocio"}</strong>{" "}
              ha sido cancelada correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{appointment.services?.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(
                  new Date(appointment.date + "T00:00:00"),
                  "EEEE, d 'de' MMMM",
                  { locale: es }
                )}{" "}
                · {appointment.start_time}
              </p>
            </div>
            {reason && (
              <p className="text-sm text-muted-foreground">
                Motivo: {reason}
              </p>
            )}
            <Link href="/" className="block">
              <Button className="w-full">Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <CalendarX2 className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-center">
            Cancelar cita
          </CardTitle>
          <CardDescription className="text-center">
            ¿Confirmas que deseas cancelar tu cita?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="font-medium">{appointment.services?.name}</p>
            <p className="text-sm text-muted-foreground">
              {appointment.businesses?.name ?? ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(
                new Date(appointment.date + "T00:00:00"),
                "EEEE, d 'de' MMMM",
                { locale: es }
              )}{" "}
              · {appointment.start_time} - {appointment.end_time}
            </p>
          </div>
          <div>
            <Label htmlFor="reason">Motivo de cancelación (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cuéntanos por qué cancelas..."
              className="mt-1"
            />
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? "Cancelando..." : "Sí, cancelar mi cita"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
