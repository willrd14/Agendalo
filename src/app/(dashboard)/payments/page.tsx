import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentsList, { type PaymentRow, type PaymentStats } from "@/components/payments/payments-list";
import { getActiveBusinessPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, currency")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const [{ data }, plan] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, currency, method, status, paypal_transaction_id, is_deposit, created_at, appointment_id, appointments(start_time, date, services(name))"
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    getActiveBusinessPlan(supabase, business.id),
  ]);

  const rows = (data ?? []) as unknown as PaymentRow[];

  const stats: PaymentStats = {
    total: rows.reduce(
      (sum, p) => (p.status === "completed" ? sum + Number(p.amount) : sum),
      0
    ),
    completedCount: rows.filter((p) => p.status === "completed").length,
    pendingCount: rows.filter((p) => p.status === "pending").length,
    count: rows.length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Historial de pagos de {business.name}
        </p>
      </div>
      <PaymentsList
        payments={rows}
        stats={stats}
        defaultCurrency={business.currency}
        plan={plan}
      />
    </div>
  );
}
