import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPayPalEligibility } from "@/lib/plans";
import BookingFlow from "@/components/booking/booking-flow";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ business: string }>;
}) {
  const { business } = await params;
  const supabase = await createClient();

  const { data: businessData } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", business)
    .single();

  if (!businessData) {
    notFound();
  }

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessData.id)
    .eq("is_active", true);

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", businessData.id)
    .eq("is_active", true);

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .eq("business_id", businessData.id)
    .eq("is_active", true);

  const { data: paymentMethodsData } = await supabase
    .from("business_payment_methods")
    .select("*")
    .eq("business_id", businessData.id)
    .eq("is_enabled", true);

  const transferMethod = (paymentMethodsData ?? []).find(
    (m: { type: string }) => m.type === "transfer"
  ) as
    | {
        bank_name: string | null;
        account_holder: string | null;
        account_number: string | null;
        transfer_notes: string | null;
      }
    | undefined;

  const paypalMethod = (paymentMethodsData ?? []).find(
    (m: { type: string }) => m.type === "paypal"
  ) as
    | {
        is_enabled: boolean;
        paypal_conversion_rate: number | null;
      }
    | undefined;

  // PayPal (cobro online por servicio) es feature exclusiva de Pro. Durante la
  // prueba gratuita el negocio también puede ofrecerlo. Se consulta con service
  // role porque la página es pública (RLS de subscriptions restringe al dueño).
  const serviceSupabase = createServiceClient();
  const paypalEligibility = await getPayPalEligibility(serviceSupabase, {
    id: businessData.id,
    created_at: businessData.created_at,
  });

  const hasConfiguredPaypal =
    (paypalMethod?.is_enabled ?? false) &&
    Number(paypalMethod?.paypal_conversion_rate ?? 0) > 0;

  const businessProps = {
    id: businessData.id,
    name: businessData.name,
    primary_color: businessData.primary_color,
    currency: businessData.currency,
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Reserva con {businessData.name}
        </h1>
      </div>
      <BookingFlow
        business={businessProps}
        services={services ?? []}
        availability={availability ?? []}
        employees={employees ?? []}
        token={businessData.slug}
        transferMethod={transferMethod}
        paypalEnabled={
          paypalEligibility.allowed && hasConfiguredPaypal
        }
        paypalConversionRate={Number(paypalMethod?.paypal_conversion_rate ?? 0)}
      />
    </div>
  );
}
