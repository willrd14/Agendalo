import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentsManager from "@/components/appointments/appointments-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, business_id, service_id, client_id, date, start_time, end_time, status, notes, services(name, price, currency), users!appointments_client_id_fkey(full_name, email)"
    )
    .eq("business_id", business.id)
    .order("date", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Citas</h1>
        <p className="text-sm text-muted-foreground">Gestiona, confirma y reprograma las reservas de tus clientes</p>
      </div>
      {business.slug ? (
        <AppointmentsManager
          initialAppointments={(appointments ?? []) as never}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Configuración incompleta</CardTitle>
            <CardDescription>
              Necesitas completar la configuración de tu negocio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button>Completar configuración</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
