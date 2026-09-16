import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend/send-email";
import { appointmentReminderEmail } from "@/lib/resend/email-templates";

export const dynamic = "force-dynamic";

// C-4: no legitimate public caller today (the reminders cron/edge function
// sends reminder emails itself via Resend directly, see
// supabase/functions/appointment-reminders). Locked down with a shared
// secret rather than left open for future internal use.
export async function POST(req: NextRequest) {
  try {
    const internalSecret = process.env.EMAIL_INTERNAL_SECRET;
    const provided = req.headers.get("x-internal-secret");
    if (!internalSecret || provided !== internalSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { to, data } = body;

    if (!to || typeof to !== "string" || !data) {
      return NextResponse.json(
        { error: "Faltan parámetros (to, data)" },
        { status: 400 }
      );
    }

    const html = appointmentReminderEmail(data);

    const result = await sendEmail({
      to,
      subject: `Recordatorio: Tu cita con ${data.businessName}`, 
      html,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Error enviando email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}