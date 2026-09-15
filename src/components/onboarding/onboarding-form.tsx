"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

type DayState = {
  active: boolean;
  start: string;
  end: string;
};

export default function OnboardingForm({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowser();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Business info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 2: Availability
  const [days, setDays] = useState<Record<number, DayState>>(() => {
    const init: Record<number, DayState> = {};
    DAYS.forEach((d) => {
      init[d.value] = { active: false, start: "09:00", end: "18:00" };
    });
    return init;
  });

  const [slug, setSlug] = useState("");

  const toggleDay = (dayValue: number) => {
    setDays((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], active: !prev[dayValue].active },
    }));
  };

  const updateDayTime = (
    dayValue: number,
    field: "start" | "end",
    value: string
  ) => {
    setDays((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], [field]: value },
    }));
  };

  const slugify = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug) setSlug(slugify(val));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const finalSlug = slug || slugify(name);

      // Check slug availability
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (existing) {
        toast.error("Esa URL ya está en uso. Prueba otra.");
        setStep(3);
        setLoading(false);
        return;
      }

      // Create business
      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          name,
          slug: finalSlug,
          description: description || null,
          phone,
          email: userEmail,
          address: address || null,
        })
        .select()
        .single();

      if (bizError) throw bizError;

      // Insert availability for active days
      const activeDays = DAYS.filter((d) => days[d.value]?.active);
      if (activeDays.length > 0) {
        const availabilityRows = activeDays.map((d) => ({
          business_id: business.id,
          day_of_week: d.value,
          start_time: days[d.value].start,
          end_time: days[d.value].end,
          is_active: true,
        }));

        const { error: availError } = await supabase
          .from("availability")
          .insert(availabilityRows);

        if (availError) throw availError;
      }

      toast.success("¡Negocio creado exitosamente!");
      router.push("/overview");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al crear el negocio";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Crea tu negocio</h1>
        <p className="text-muted-foreground">
          Configura tu negocio para comenzar a recibir reservas
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= n ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {step > n ? <Check className="h-4 w-4" /> : n}
            </div>
            {n < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  step > n ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Business info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Datos del negocio</CardTitle>
            <CardDescription>
              Esta información aparecerá en tu página pública.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del negocio *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Barbería El Corte"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe brevemente tu negocio y servicios"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de contacto *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 809 000 0000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección (opcional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dirección de tu negocio"
              />
            </div>
          </CardContent>
          <div className="flex justify-end p-6">
            <Button
              disabled={!name || !phone}
              onClick={() => setStep(2)}
            >
              Continuar <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Availability */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Horarios de atención</CardTitle>
            <CardDescription>
              Selecciona los días y horas en que atiendes. Estos definen la
              disponibilidad para tus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((d) => (
              <div
                key={d.value}
                className="flex items-center gap-4 p-3 bg-muted rounded-md"
              >
                <input
                  type="checkbox"
                  checked={days[d.value]?.active}
                  onChange={() => toggleDay(d.value)}
                  className="h-4 w-4"
                />
                <span className="w-24 font-medium text-foreground/80">
                  {d.label}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={days[d.value]?.start}
                    onChange={(e) =>
                      updateDayTime(d.value, "start", e.target.value)
                    }
                    disabled={!days[d.value]?.active}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">a</span>
                  <Input
                    type="time"
                    value={days[d.value]?.end}
                    onChange={(e) =>
                      updateDayTime(d.value, "end", e.target.value)
                    }
                    disabled={!days[d.value]?.active}
                    className="w-32"
                  />
                </div>
              </div>
            ))}
            <div>
              <Label className="mb-2 block">Tu URL pública</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">agendalo.com/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="mi-negocio"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Esta URL es la que compartirás con tus clientes para que
                reserven.
              </p>
            </div>
          </CardContent>
          <div className="flex justify-between p-6">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
            </Button>
            <Button
              disabled={!slug}
              onClick={() => setStep(3)}
            >
              Revisar <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Review & confirm */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Revisa tu configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Negocio</p>
              <p className="font-medium text-foreground">{name}</p>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              <p className="text-sm text-muted-foreground">📞 {phone}</p>
              {address && (
                <p className="text-sm text-muted-foreground">📍 {address}</p>
              )}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                URL pública
              </p>
              <p className="text-emerald-600 font-medium">
                agendalo.com/{slug}
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Horarios de atención
              </p>
              <div className="space-y-1">
                {DAYS.filter((d) => days[d.value]?.active).map((d) => (
                  <p key={d.value} className="text-sm text-foreground/80">
                    {d.label}: {days[d.value].start} - {days[d.value].end}
                  </p>
                ))}
                {DAYS.filter((d) => days[d.value]?.active).length === 0 && (
                  <p className="text-sm text-amber-600">
                    No has seleccionado ningún día. Tus clientes no podrán
                    reservar.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <div className="flex justify-between p-6">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? "Creando..." : "Crear negocio"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
