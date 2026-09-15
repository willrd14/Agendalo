import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CancelAppointment from "@/components/booking/cancel-appointment";

export const dynamic = "force-dynamic";

export default async function CancelPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await createClient();
  const { token } = await params;

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, status, date, start_time, end_time, cancel_reason, services(name), businesses(name)"
    )
    .eq("cancel_token", token)
    .maybeSingle();

  if (!appointment) {
    notFound();
  }

  // If already cancelled, show state
  // If not and user wants to cancel, render the client component
  return <CancelAppointment appointment={appointment as never} />;
}
