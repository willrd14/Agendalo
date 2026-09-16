import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPayPalEligibility, getActiveBusinessPlan, isProPlan } from "@/lib/plans";
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

  // A-1: business_payment_methods can no longer be read anonymously (RLS
  // now restricts SELECT to the owner + service role, see migration 0018 —
  // it used to be `FOR SELECT USING (true)`, exposing every business' bank
  // account details to anyone with the anon key). The public booking page
  // needs this data for exactly one business, so it's fetched here with the
  // service role and passed down as a prop instead of letting the client
  // component query it directly.
  const serviceSupabase = createServiceClient();
  const { data: paymentMethodsData } = await serviceSupabase
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
  const paypalEligibility = await getPayPalEligibility(serviceSupabase, {
    id: businessData.id,
    created_at: businessData.created_at,
  });

  const hasConfiguredPaypal =
    (paypalMethod?.is_enabled ?? false) &&
    Number(paypalMethod?.paypal_conversion_rate ?? 0) > 0;

  // El depósito para garantizar citas es una función exclusiva del plan Pro
  // (sin prueba gratuita) y requiere PayPal configurado para poder cobrarse
  // en línea. Si el negocio no tiene PayPal habilitado, no se exige
  // depósito: no hay forma de cobrarlo online y la cita sigue el flujo
  // manual habitual.
  const businessPlan = await getActiveBusinessPlan(serviceSupabase, businessData.id);
  const depositRequired =
    isProPlan(businessPlan) &&
    Boolean(businessData.deposit_required) &&
    paypalEligibility.allowed &&
    hasConfiguredPaypal;

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
        depositRequired={depositRequired}
        depositType={(businessData.deposit_type as "percentage" | "fixed") ?? "percentage"}
        depositPercentage={Number(businessData.deposit_percentage ?? 20)}
        depositFixedAmount={Number(businessData.deposit_fixed_amount ?? 0)}
      />
    </div>
  );
}
