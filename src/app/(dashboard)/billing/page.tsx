import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BillingManager from "@/components/billing/billing-manager";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Facturación</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu suscripción y planes de {business.name}
        </p>
      </div>
      <BillingManager />
    </div>
  );
}
