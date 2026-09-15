import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServicesManager from "@/components/services/services-manager";

export default async function ServicesPage() {
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

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Servicios</h1>
        <p className="text-sm text-muted-foreground">Lo que ofreces, con duración y precio</p>
      </div>
      <ServicesManager
        businessId={business.id}
        businessCurrency={business.currency}
        initialServices={services ?? []}
      />
    </div>
  );
}
