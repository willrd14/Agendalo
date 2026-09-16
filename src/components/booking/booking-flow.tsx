"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarPlus, User } from "lucide-react";
import { toast } from "sonner";
import { generateIcsFile, downloadIcsFile } from "@/lib/ics";
import { generateTimeSlots, computeEndTime } from "@/lib/currency";

interface BusinessProps {
  id: string;
  name: string;
  primary_color: string | null;
  currency: string;
}

interface Employee {
  id: string;
  name: string;
  specialty?: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  employee_id?: string;
}

interface ConfirmedAppointment {
  serviceName: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface TransferMethod {
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  transfer_notes: string | null;
}

export default function BookingFlow({
  business,
  services,
  availability,
  employees,
  token,
  transferMethod,
  paypalEnabled,
  paypalConversionRate,
  depositRequired,
  depositType,
  depositPercentage,
  depositFixedAmount,
}: {
  business: BusinessProps;
  services: Service[];
  availability: Availability[];
  employees: Employee[];
  token: string;
  transferMethod?: TransferMethod;
  paypalEnabled?: boolean;
  paypalConversionRate?: number;
  /** True when the business requires a deposit AND it can be collected online (Pro + PayPal configured). */
  depositRequired?: boolean;
  depositType?: "percentage" | "fixed";
  depositPercentage?: number;
  depositFixedAmount?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseBrowser();

  const serviceIdFromUrl = searchParams.get("service");
  const autoSelectedService = serviceIdFromUrl
    ? services.find((s) => s.id === serviceIdFromUrl) ?? null
    : null;

  const [step, setStep] = useState(autoSelectedService ? 2 : 1);
  const [selectedService, setSelectedService] = useState<Service | null>(autoSelectedService);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<ConfirmedAppointment | null>(null);

  const businessId = business.id;
  const primary = business.primary_color || "#059669";

  // Generate available dates (next 30 days)
  const availableDates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = addDays(today, i);
    const dayOfWeek = date.getDay();
    const avail = availability.find(
      (a) => a.day_of_week === dayOfWeek
    );
    if (avail) {
      availableDates.push(date);
    }
  }

  // Generate available times for selected date
  const getAvailableTimes = (): string[] => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay();
    const avail = availability.find(
      (a) => a.day_of_week === dayOfWeek && (!selectedEmployee || a.employee_id === selectedEmployee.id)
    );
    if (!avail || !selectedService) return [];

    return generateTimeSlots(
      avail.start_time,
      avail.end_time,
      selectedService.duration_minutes
    );
  };

  const availableTimes = getAvailableTimes();

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setLoading(true);

    const endTime = computeEndTime(selectedTime, selectedService.duration_minutes);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      let clientId: string | null = null;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        clientId = user.id;
      } else {
        // Create account for guest client using email + a disposable token
        const { data, error } = await supabase.auth.signUp({
          email: clientEmail,
          password: crypto.randomUUID().slice(0, 20),
          options: { data: { full_name: clientName } },
        });
        if (error) throw error;
        if (data.user) {
          clientId = data.user.id;
        }
      }

      if (!clientId) {
        throw new Error("No se pudo identificar al cliente");
      }

      const { data: insertedAppt, error: insertError } = await supabase
        .from("appointments")
        .insert({
          business_id: businessId,
          service_id: selectedService.id,
          employee_id: selectedEmployee?.id || null,
          client_id: clientId,
          date: dateStr,
          start_time: selectedTime,
          end_time: endTime,
          status: "pending",
          notes: notes || null,
          cancel_token: crypto.randomUUID(),
        })
        .select("id, cancel_token")
        .single();

      if (insertError) throw insertError;

      const cancelUrl = insertedAppt
        ? `${window.location.origin}/cancelar/${insertedAppt.cancel_token}`
        : undefined;

      // Send confirmation email (best-effort, don't block)
      try {
        await fetch("/api/emails/appointment-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: clientEmail,
            data: {
              businessName: business.name,
              clientName,
              serviceName: selectedService.name,
              date: format(selectedDate, "EEEE, d 'de' MMMM, yyyy", {
                locale: es,
              }),
              startTime: selectedTime,
              endTime,
              price: selectedService.price.toLocaleString("es-DO"),
              currency: business.currency,
              appointmentId: insertedAppt?.id,
              cancelUrl,
            },
          }),
        });
      } catch (emailErr) {
        console.error("Error enviando email:", emailErr);
      }

      setConfirmed(true);
      if (selectedDate) {
        const [ch, cm] = endTime.split(":").map(Number);
        const endDate = new Date(selectedDate);
        endDate.setHours(ch, cm, 0, 0);
        setConfirmedAppointment({
          serviceName: selectedService.name,
          date: selectedDate,
          startTime: selectedTime,
          endTime,
        });
      }
      setStep(4);
      toast.success("Cita reservada correctamente");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al reservar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaypalPayment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    if (!clientEmail) {
      toast.error("Ingresa tu email");
      return;
    }
    setLoading(true);
    try {
      if (!paypalEnabled || !paypalConversionRate) {
        throw new Error("El pago con PayPal no está disponible para este negocio");
      }

      const endTime = computeEndTime(selectedTime, selectedService.duration_minutes);
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const res = await fetch("/api/payments/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          price: Number(selectedService.price),
          currency: business.currency,
          conversionRate: paypalConversionRate,
          clientName,
          clientEmail,
          clientPhone: clientPhone || undefined,
          notes: notes || undefined,
          appointmentDate: dateStr,
          startTime: selectedTime,
          endTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Error al iniciar el pago");
      }

      if (!data.approveUrl) {
        throw new Error("No se pudo redirigir a PayPal");
      }

      window.location.assign(data.approveUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar el pago";
      toast.error(message);
      setLoading(false);
    }
  };

  const depositAmount =
    selectedService && depositRequired
      ? depositType === "fixed"
        ? Number(depositFixedAmount ?? 0)
        : Number(
            ((Number(selectedService.price) * Number(depositPercentage ?? 0)) / 100).toFixed(2)
          )
      : 0;

  // QA-1/QA-2: a deposit is only actually collectible online when it
  // computes to a positive amount (e.g. a free service with a percentage
  // deposit would compute to 0). If it doesn't, fall back to the manual
  // "Confirmar reserva" flow instead of leaving the client with no way to
  // book at all.
  const depositCollectible = depositRequired && depositAmount > 0;

  const handleDepositPayment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    if (!clientEmail) {
      toast.error("Ingresa tu email");
      return;
    }
    setLoading(true);
    try {
      if (!paypalEnabled || !paypalConversionRate) {
        throw new Error("El pago con PayPal no está disponible para este negocio");
      }

      const endTime = computeEndTime(selectedTime, selectedService.duration_minutes);
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const res = await fetch("/api/payments/paypal/create-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          price: Number(selectedService.price),
          currency: business.currency,
          conversionRate: paypalConversionRate,
          clientName,
          clientEmail,
          clientPhone: clientPhone || undefined,
          notes: notes || undefined,
          appointmentDate: dateStr,
          startTime: selectedTime,
          endTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Error al iniciar el pago del depósito");
      }

      if (!data.approveUrl) {
        throw new Error("No se pudo redirigir a PayPal");
      }

      window.location.assign(data.approveUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar el pago del depósito";
      toast.error(message);
      setLoading(false);
    }
  };

  const handleAddToCalendar = () => {    if (!confirmedAppointment || !selectedService) return;

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      "T" +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      "00";

    const start = confirmedAppointment.date;
    start.setHours(
      Number(confirmedAppointment.startTime.split(":")[0]),
      Number(confirmedAppointment.startTime.split(":")[1]),
      0,
      0
    );
    const end = new Date(start);
    end.setMinutes(
      end.getMinutes() + (selectedService.duration_minutes || 60)
    );

    const icsContent = generateIcsFile({
      uid: `${token}-${confirmedAppointment.date.toISOString()}`,
      summary: `${selectedService.name} - ${business.name}`,
      description: `Cita reservada con ${business.name}. Servicio: ${selectedService.name}.`,
      location: business.name,
      dtstart: fmt(start),
      dtend: fmt(end),
      url: `${window.location.origin}/${token}`,
    });

    downloadIcsFile(
      icsContent,
      `cita-${selectedService.name.replace(/\s+/g, "-").toLowerCase()}.ics`
    );

    toast.success("Archivo de calendario descargado. Ábrelo para guardarlo.");
  };

  if (confirmed) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-3xl">{"\u2705"}</span>
          </div>
          <CardTitle className="text-2xl">{"\u00a1"}Cita confirmada!</CardTitle>
          <CardDescription>
            Hemos recibido tu reserva correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-left">
          <div className="p-3 bg-muted rounded-md space-y-1">
            <p className="font-medium">{selectedService?.name}</p>
            {selectedDate && (
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })} a
                las {selectedTime}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Te enviaremos un email de confirmación a {clientEmail}
          </p>
          {transferMethod &&
            (transferMethod.bank_name ||
              transferMethod.account_number ||
              transferMethod.account_holder) && (
              <div className="p-3 bg-blue-50 rounded-md space-y-1 text-left">
                <p className="font-medium text-foreground">
                  Cómo pagar por transferencia
                </p>
                {transferMethod.bank_name && (
                  <p className="text-sm text-muted-foreground">
                    Banco: <span className="font-medium">{transferMethod.bank_name}</span>
                  </p>
                )}
                {transferMethod.account_holder && (
                  <p className="text-sm text-muted-foreground">
                    Titular:{" "}
                    <span className="font-medium">
                      {transferMethod.account_holder}
                    </span>
                  </p>
                )}
                {transferMethod.account_number && (
                  <p className="text-sm text-muted-foreground">
                    Cuenta:{" "}
                    <span className="font-medium">
                      {transferMethod.account_number}
                    </span>
                  </p>
                )}
                {transferMethod.transfer_notes && (
                  <p className="text-sm text-muted-foreground">
                    {transferMethod.transfer_notes}
                  </p>
                )}
              </div>
            )}
        </CardContent>
        <CardContent>
          <Button
            variant="outline"
            className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            onClick={handleAddToCalendar}
          >
            <CalendarPlus className="mr-2 h-4 w-4" /> Agregar a mi calendario
          </Button>
        </CardContent>
        <CardHeader className="space-y-2">
          <Button
            className="w-full"
            onClick={() => router.push("/history")}
          >
            Ver mis citas
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/${token}`)}
          >
            Volver al inicio
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= n ? "text-white" : "bg-muted text-muted-foreground"
              }`}
              style={step >= n ? { backgroundColor: primary } : undefined}
            >
              {n}
            </div>
            {n < 3 && <div className="w-12 h-0.5 bg-muted" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select service */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Selecciona un servicio
          </h2>
          {services.length > 0 ? (
            services.map((service) => (
              <Card
                key={service.id}
                className="cursor-pointer hover:border-emerald-500 transition-colors"
                data-role="service-card"
                onClick={() => {
                  setSelectedService(service);
                  setStep(2);
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.duration_minutes} min
                    </p>
                  </div>
                  <p className="font-bold" style={{ color: primary }}>
                    ${Number(service.price).toLocaleString("es-DO")}{" "}
                    {business.currency}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Este negocio aún no tiene servicios disponibles.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Select date & time */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
              <ChevronLeft />
            </Button>
            <h2 className="text-xl font-bold text-foreground">
              {selectedService?.name}
            </h2>
          </div>

          {employees.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">
                Selecciona un profesional
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {employees.map((emp) => (
                  <Button
                    key={emp.id}
                    variant={selectedEmployee?.id === emp.id ? "default" : "outline"}
                    style={
                      selectedEmployee?.id === emp.id
                        ? { backgroundColor: primary, borderColor: primary }
                        : undefined
                    }
                    className="justify-start"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {emp.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Fecha</Label>
              <div className="border rounded-md p-3">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-semibold text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                  {availableDates.map((date) => {
                    const selected =
                      selectedDate &&
                      selectedDate.toDateString() === date.toDateString();
                    return (
                      <Button
                        key={date.toISOString()}
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        style={
                          selected
                            ? { backgroundColor: primary, borderColor: primary }
                            : undefined
                        }
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Hora</Label>
              {selectedDate ? (
                availableTimes.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        style={
                          selectedTime === time
                            ? { backgroundColor: primary, borderColor: primary }
                            : undefined
                        }
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay horarios disponibles este día.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Primero selecciona una fecha.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              disabled={!selectedDate || !selectedTime}
              style={{ backgroundColor: primary }}
              onClick={() => setStep(3)}
            >
              Continuar <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Client details */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep(2)}>
              <ChevronLeft />
            </Button>
            <h2 className="text-xl font-bold text-foreground">
              Tus datos de contacto
            </h2>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre completo</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Teléfono (opcional)</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 809 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Algún detalle adicional"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de tu reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               <div className="flex justify-between">
                 <span className="text-muted-foreground">Profesional</span>
                 <span className="font-medium">{selectedEmployee?.name || "Cualquiera"}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-muted-foreground">Servicio</span>
                 <span className="font-medium">{selectedService?.name}</span>
               </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium">
                  {selectedDate &&
                    format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hora</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold" style={{ color: primary }}>
                  ${Number(selectedService?.price ?? 0).toLocaleString("es-DO")}{" "}
                  {business.currency}
                </span>
              </div>
              {depositCollectible && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Depósito para garantizar la cita
                  </span>
                  <span className="font-semibold text-foreground">
                    ${depositAmount.toLocaleString("es-DO")} {business.currency}
                  </span>
                </div>
              )}
            </CardContent>
            <CardHeader>
              {depositCollectible ? (
                <>
                  <p className="text-xs text-muted-foreground mb-1">
                    Este negocio requiere un depósito por PayPal para
                    confirmar la cita. El resto se paga directamente en el
                    negocio.
                  </p>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: primary }}
                    onClick={handleDepositPayment}
                    disabled={loading || !clientName || !clientEmail}
                  >
                    {loading
                      ? "Procesando..."
                      : "Pagar depósito con PayPal (USD)"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="w-full"
                    style={{ backgroundColor: primary }}
                    onClick={handleConfirm}
                    disabled={loading || !clientName || !clientEmail}
                  >
                    {loading ? "Procesando..." : "Confirmar reserva"}
                  </Button>
                  {paypalEnabled && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePaypalPayment}
                      disabled={loading || !clientName || !clientEmail}
                    >
                      Pagar ahora con PayPal (USD)
                    </Button>
                  )}
                </>
              )}
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
