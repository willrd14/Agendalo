"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  services: { name: string } | null;
  users: { full_name: string } | null;
}

const statusDot: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-emerald-500",
  cancelled: "bg-red-400",
  completed: "bg-blue-500",
};

export default function CalendarView({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getAppointmentsForDate = (date: Date) => {
    return initialAppointments.filter((a) => {
      const apptDate = new Date(a.date + "T00:00:00");
      return isSameDay(apptDate, date);
    });
  };

  const selectedAppointments = selectedDate
    ? getAppointmentsForDate(selectedDate)
    : [];

  const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-foreground capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
        >
          Hoy
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-semibold text-muted-foreground py-2"
          >
            {label}
          </div>
        ))}
        {days.map((date, i) => {
          const dayAppts = getAppointmentsForDate(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={`
                min-h-20 p-1 text-left rounded-md border transition-colors
                ${!isSameMonth(date, currentDate) ? "bg-muted opacity-50" : "bg-card"}
                ${isSelected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-border"}
                ${isToday(date) ? "bg-emerald-50" : ""}
                hover:border-emerald-400
              `}
            >
              <div className="text-xs font-medium text-foreground/80">
                {format(date, "d")}
              </div>
              <div className="space-y-0.5 mt-1">
                {dayAppts.slice(0, 3).map((appt) => (
                  <div key={appt.id} className="flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusDot[appt.status] ?? "bg-muted-foreground/30"}`}
                    />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {appt.start_time}
                    </span>
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{dayAppts.length - 3} más
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day details */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">
          {selectedDate
            ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
            : "Selecciona un día"}
        </h3>
        {selectedAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay citas este día.</p>
        ) : (
          <div className="space-y-2">
            {selectedAppointments.map((appt) => (
              <Card key={appt.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {appt.services?.name ?? "Servicio"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {appt.users?.full_name ?? "Cliente"} ·{" "}
                    <span className="font-medium">
                      {appt.start_time} - {appt.end_time}
                    </span>
                  </p>
                </div>
                <Badge
                  className={
                    appt.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700"
                      : appt.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : appt.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {appt.status}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
