import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BusinessSettings from "@/components/settings/business-settings";
import AvailabilityManager from "@/components/availability/availability-manager";
import PaymentMethodsManager, {
  type PaymentMethod,
} from "@/components/settings/payment-methods-manager";
import CommunicationSettings from "@/components/communication/communication-settings";
import { getActiveBusinessPlan } from "@/lib/plans";

export default async function SettingsPage() {
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

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", business.id);

  const { data: paymentMethods } = await supabase
    .from("business_payment_methods")
    .select("*")
    .eq("business_id", business.id);

  const plan = await getActiveBusinessPlan(supabase, business.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground">Datos del negocio, horarios y métodos de pago</p>
      </div>
      <div className="space-y-6">
        <BusinessSettings business={business} />
        <PaymentMethodsManager
          businessId={business.id}
          businessCurrency={business.currency ?? "DOP"}
          initialMethods={(paymentMethods ?? []) as unknown as PaymentMethod[]}
        />
        <AvailabilityManager
          businessId={business.id}
          initialAvailability={availability ?? []}
        />
        <CommunicationSettings
          businessId={business.id}
          plan={plan}
          initialSmsEnabled={business.sms_reminders_enabled ?? false}
          initialTemplate={business.reminder_message_template ?? null}
        />
      </div>
    </div>
  );
}
