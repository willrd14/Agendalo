import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Users, Clock, TrendingUp, PlusCircle, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

export default async function OverviewPage() {
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

  const today = new Date().toISOString().split("T")[0];

  const [appointmentsRes, servicesRes, clientsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, date, start_time, end_time, status, services(name, price), users!appointments_client_id_fkey(full_name)"
      )
      .eq("business_id", business.id)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("services")
      .select("id")
      .eq("business_id", business.id)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("client_id")
      .eq("business_id", business.id),
  ]);

  interface OverviewAppointment {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    services: { name: string | null; price: number | null } | null;
    users: { full_name: string | null } | null;
  }

  const appointments = (appointmentsRes.data ??
    []) as unknown as OverviewAppointment[];
  const activeServices = servicesRes.data?.length ?? 0;
  const totalClients =
    new Set((clientsRes.data ?? []).map((c: { client_id: string }) => c.client_id)).size ?? 0;

  const todayCount = appointments.filter((a) => a.date === today).length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const confirmedCount = appointments.filter(
    (a) => a.status === "confirmed"
  ).length;

  const revenue = appointments
    .filter(
      (a) => (a.status === "completed" || a.status === "confirmed")
    )
    .reduce((sum, a) => sum + (Number(a.services?.price) || 0), 0);

  // Upcoming & active appointments (not cancelled), future
  const upcoming = appointments
    .filter(
      (a) =>
        a.status !== "cancelled" &&
        a.status !== "completed" &&
        (a.date > today || (a.date === today))
    )
    .slice(0, 8);

  const recentCompleted = appointments
    .filter((a) => a.status === "completed")
    .length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{business.name}</h1>
          <p className="text-muted-foreground capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <Link href="/services">
          <Button className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo servicio
          </Button>
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{todayCount}</p>
                <p className="text-xs text-muted-foreground">Citas hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes de confirmar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{totalClients}</p>
                <p className="text-xs text-muted-foreground">Clientes únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {revenue.toLocaleString("es-DO")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ingresos ({business.currency})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Próximas citas</CardTitle>
              <Link
                href="/appointments"
                className="text-sm text-emerald-600 flex items-center gap-1 hover:underline"
              >
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground mb-3">
                    No tienes citas próximas.
                  </p>
                  <Link href="/services" className="inline-block">
                    <Button variant="outline" size="sm">
                      Comparte tu página para recibir reservas
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((appt) => {
                    const isToday = appt.date === today;
                    return (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                              isToday ? "bg-primary text-white" : "bg-card border border-border"
                            }`}
                          >
                            <span className={`text-lg font-bold leading-none ${isToday ? "text-white" : "text-foreground"}`}>
                              {format(new Date(appt.date + "T00:00:00"), "d")}
                            </span>
                            <span className={`text-[10px] capitalize ${isToday ? "text-emerald-100" : "text-muted-foreground"}`}>
                              {format(new Date(appt.date + "T00:00:00"), "MMM", { locale: es })}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {appt.services?.name ?? "Servicio"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {appt.users?.full_name ?? "Cliente"} ·{" "}
                              <span className="font-medium">
                                {appt.start_time} - {appt.end_time}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Badge className={`${statusBadge[appt.status] ?? ""} shrink-0`}>
                          {appt.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick summary column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmadas</span>
                <span className="font-semibold text-foreground">{confirmedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completadas</span>
                <span className="font-semibold text-foreground">{recentCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Servicios activos</span>
                <span className="font-semibold text-foreground">{activeServices}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total citas</span>
                <span className="font-semibold text-foreground">{appointments.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tu página pública</CardTitle>
              <CardDescription>
                Comparte este enlace para recibir reservas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/${business.slug}`}
                target="_blank"
                className="text-sm text-emerald-600 hover:underline break-all"
              >
                agendalo.com/{business.slug}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
