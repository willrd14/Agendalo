"use client";

import { useState } from "react";
import { useSupabaseBrowser } from "@/lib/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save } from "lucide-react";

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

interface AvailabilityRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  employee_id?: string;
}

type DayState = { active: boolean; start: string; end: string };

export default function AvailabilityManager({
  businessId,
  initialAvailability,
  employeeId,
}: {
  businessId: string;
  initialAvailability: AvailabilityRow[];
  employeeId?: string;
}) {
  const supabase = useSupabaseBrowser();

  const [days, setDays] = useState<Record<number, DayState>>(() => {
    const init: Record<number, DayState> = {};
    DAYS.forEach((d) => {
      const existing = initialAvailability.find(
        (a) => a.day_of_week === d.value
      );
      init[d.value] = existing
        ? {
            active: existing.is_active,
            start: existing.start_time.slice(0, 5),
            end: existing.end_time.slice(0, 5),
          }
        : { active: false, start: "09:00", end: "18:00" };
    });
    return init;
  });

  const [loading, setLoading] = useState(false);

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

  const handleSave = async () => {
    setLoading(true);
    try {
      // Get existing availability
      const { data: existing } = await supabase
        .from("availability")
        .select("id, day_of_week")
        .eq("business_id", businessId);

      const existingMap: Record<number, string> = {};
      (existing ?? []).forEach((a) => {
        existingMap[a.day_of_week] = a.id;
      });

      // For each day, either update or insert or delete
      const promises = DAYS.map(async (d) => {
        const state = days[d.value];
        const existingId = existingMap[d.value];

        if (existingId) {
          if (!state.active) {
            // Delete inactive day
            return supabase.from("availability").delete().eq("id", existingId);
          } else {
            // Update existing
            return supabase
              .from("availability")
              .update({
                start_time: state.start,
                end_time: state.end,
                is_active: true,
                employee_id: employeeId || null,
              })
              .eq("id", existingId);
          }
        } else if (state.active) {
          // Insert new
          return supabase.from("availability").insert({
            business_id: businessId,
            day_of_week: d.value,
            start_time: state.start,
            end_time: state.end,
            is_active: true,
            employee_id: employeeId || null,
          });
        }
        return null;
      });

      const results = await Promise.all(promises);
      const error = results.find((r) => r && r.error)?.error;
      if (error) throw error;

      toast.success("Horarios actualizados");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al guardar horarios";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horarios de atención</CardTitle>
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
            <span className="w-24 font-medium text-foreground/80">{d.label}</span>
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="time"
                value={days[d.value]?.start}
                onChange={(e) => updateDayTime(d.value, "start", e.target.value)}
                disabled={!days[d.value]?.active}
                className="w-32"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="time"
                value={days[d.value]?.end}
                onChange={(e) => updateDayTime(d.value, "end", e.target.value)}
                disabled={!days[d.value]?.active}
                className="w-32"
              />
            </div>
          </div>
        ))}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Guardando..." : "Guardar horarios"}
        </Button>
      </CardContent>
    </Card>
  );
}
