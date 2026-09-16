import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/resend/send-email";
import { appointmentConfirmationEmail } from "@/lib/resend/email-templates";
import { createServiceClient } from "@/lib/supabase/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// C-4: unlike the other two email routes, this one has a legitimate
// anonymous caller — the public booking page confirms a free/no-payment
// reservation from the browser (see src/components/booking/booking-flow.tsx)
// and can't hold a server secret. Defense here is: (a) strict input
// validation, (b) all interpolated strings are HTML-escaped in
// email-templates.ts (no injection), (c) IP-based rate limiting (A-3) to
// blunt spam/abuse of this open endpoint.
const dataSchema = z.object({
  businessName: z.string().max(200).default(""),
  clientName: z.string().max(200).default(""),
  serviceName: z.string().max(200).default(""),
  date: z.string().max(200).default(""),
  startTime: z.string().max(50).default(""),
  endTime: z.string().max(50).default(""),
  price: z.string().max(50).default(""),
  currency: z.string().max(10).default(""),
  businessPhone: z.string().max(60).optional(),
  cancelUrl: z.string().max(500).optional(),
  appointmentId: z.string().max(100).optional(),
  priceNote: z.string().max(500).optional(),
});

const bodySchema = z.object({
  to: z.string().email().max(320),
  data: dataSchema,
});

const RATE_LIMIT = { limit: 5, windowMinutes: 10 };

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const clientIp = getClientIp(req);
    const limited = await isRateLimited(
      supabase,
      "emails/appointment-confirmation",
      clientIp,
      RATE_LIMIT
    );
    if (limited) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Faltan parámetros (to, data)" },
        { status: 400 }
      );
    }
    const { to, data } = parsed.data;

    const html = appointmentConfirmationEmail(data);

    const result = await sendEmail({
      to,
      subject: `¡Cita confirmada en ${data.businessName}! - Agendalo`,
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