import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeesManager from "@/components/employees/employees-manager";
import { getActiveBusinessPlan } from "@/lib/plans";

export default async function EmployeesPage() {
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

  const [{ data: employees }, plan] = await Promise.all([
    supabase
      .from("employees")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    getActiveBusinessPlan(supabase, business.id),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Empleados</h1>
        <p className="text-sm text-muted-foreground">Tu equipo y sus horarios de atención</p>
      </div>
      <EmployeesManager
        businessId={business.id}
        initialEmployees={employees ?? []}
        plan={plan ?? "basic"}
      />
    </div>
  );
}
