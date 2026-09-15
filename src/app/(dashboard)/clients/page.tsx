import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientsList from "@/components/clients/clients-list";

export const dynamic = "force-dynamic";

interface AggregatedClient {
  client_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  appointment_count: number;
  completed_count: number;
  last_appointment: string | null;
}

interface AppointmentRow {
  client_id: string;
  status: string;
  date: string;
  users: { full_name: string; email: string; phone: string } | null;
}

export default async function ClientsPage() {
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

  // Get all appointments with client info
  const { data: appointments } = await supabase
    .from("appointments")
    .select("client_id, status, date, users!appointments_client_id_fkey(full_name, email, phone)")
    .eq("business_id", business.id)
    .order("date", { ascending: false });

  // Aggregate clients
  const clientMap = new Map<string, AggregatedClient>();
  (appointments as AppointmentRow[] | null ?? []).forEach((appt) => {
    const client = appt.users;
    if (!client) return;
    const existing = clientMap.get(appt.client_id);
    if (existing) {
      existing.appointment_count += 1;
      if (appt.status === "completed") existing.completed_count += 1;
      if (!existing.last_appointment && appt.date) {
        existing.last_appointment = appt.date;
      }
    } else {
      clientMap.set(appt.client_id, {
        client_id: appt.client_id,
        full_name: client.full_name ?? "Cliente",
        email: client.email ?? "",
        phone: client.phone ?? null,
        appointment_count: 1,
        completed_count: appt.status === "completed" ? 1 : 0,
        last_appointment: appt.date ?? null,
      });
    }
  });

  const clients = Array.from(clientMap.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground">Todas las personas que han reservado contigo</p>
      </div>
      <ClientsList clients={clients} />
    </div>
  );
}
