import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend/send-email";
import { appointmentCancelledEmail } from "@/lib/resend/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, data } = body;

    if (!to || !data) {
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