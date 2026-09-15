import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientHistory from "@/components/client-history/client-history";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, date, start_time, end_time, status, notes, services(name), businesses(name)"
    )
    .eq("client_id", user.id)
    .order("date", { ascending: false });

  return (
    <ClientHistory appointments={(appointments ?? []) as never} />
  );
}