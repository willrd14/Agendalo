import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, date, start_time, end_time, status, services(name), users!appointments_client_id_fkey(full_name)"
    )
    .eq("business_id", business.id)
    .order("start_time", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendario</h1>
        <p className="text-sm text-muted-foreground">Vista semanal de la disponibilidad y las citas agendadas</p>
      </div>
      <CalendarView initialAppointments={(appointments ?? []) as never} />
    </div>
  );
}
