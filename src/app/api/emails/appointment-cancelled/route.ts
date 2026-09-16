import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend/send-email";
import { appointmentCancelledEmail } from "@/lib/resend/email-templates";

export const dynamic = "force-dynamic";

// C-4: this route has no legitimate public/anonymous caller today (unlike
// appointment-confirmation, which the booking page calls directly from the
// browser for the no-payment flow). It is only meant for internal/future
// server-to-server use, so it's locked down with a shared secret instead of
// being left open — closes the open-relay + arbitrary-HTML risk entirely.
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

    const html = appointmentCancelledEmail(data);

    const result = await sendEmail({
      to,
      subject: `Cita cancelada con ${data.businessName}`, 
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