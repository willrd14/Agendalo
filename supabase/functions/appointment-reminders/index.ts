import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@3";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DEFAULT_REMINDER_TEMPLATE =
  "Hola {{cliente}}, te recordamos tu cita con {{negocio}} para {{servicio}} el {{fecha}} a las {{hora}}. ¡Te esperamos!";

function renderTemplate(
  template: string | null | undefined,
  data: { clientName: string; businessName: string; serviceName: string; date: string; startTime: string }
): string {
  const tpl = template && template.trim() ? template : DEFAULT_REMINDER_TEMPLATE;
  return tpl
    .replaceAll("{{cliente}}", data.clientName)
    .replaceAll("{{negocio}}", data.businessName)
    .replaceAll("{{servicio}}", data.serviceName)
    .replaceAll("{{fecha}}", data.date)
    .replaceAll("{{hora}}", data.startTime);
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

async function sendTwilioMessage(opts: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  to: string;
  from: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`;
  const form = new URLSearchParams({ To: opts.to, From: opts.from, Body: opts.body });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${opts.apiKeySid}:${opts.apiKeySecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message ?? `Twilio ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red con Twilio" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://agendalo.com";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    // Credenciales de Twilio (opcionales: si faltan, simplemente se omite
    // el envío por SMS/WhatsApp y solo se manda el recordatorio por email).
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const twilioApiKeySid = Deno.env.get("TWILIO_API_KEY_SID") ?? "";
    const twilioApiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET") ?? "";
    const twilioSmsNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
    const twilioReady = Boolean(twilioAccountSid && twilioApiKeySid && twilioApiKeySecret);

    const auth = req.headers.get("x-cron-secret");
    if (!cronSecret || auth !== cronSecret) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select(
        "id, business_id, date, start_time, end_time, cancel_token, services(name), users!appointments_client_id_fkey(full_name, email, phone), businesses(name, sms_reminders_enabled, reminder_message_template)"
      )
      .eq("date", dateStr)
      .eq("status", "confirmed");

    if (fetchError) {
      return errorResponse(`fetch: ${fetchError.message}`, corsHeaders);
    }

    // Plan activo por negocio (para no enviar SMS/WhatsApp — funciones Pro —
    // a negocios en plan Básico, aunque tuvieran el toggle activado).
    const businessIds = Array.from(
      new Set((appointments ?? []).map((a) => a.business_id as string))
    );
    const proBusinessIds = new Set<string>();
    if (businessIds.length > 0) {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("business_id, plan, status")
        .in("business_id", businessIds)
        .in("status", ["active", "past_due"])
        .eq("plan", "pro");
      (subs ?? []).forEach((s) => proBusinessIds.add(s.business_id as string));
    }

    let sentEmail = 0;
    let sentSms = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const appt of appointments ?? []) {
      const client = appt.users as { full_name: string; email: string; phone: string | null } | null;
      const service = appt.services as { name: string } | null;
      const business = appt.businesses as {
        name: string;
        sms_reminders_enabled: boolean | null;
        reminder_message_template: string | null;
      } | null;

      const dt = new Date(`${appt.date as string}T00:00:00`);
      const dateLabel = dt.toLocaleDateString("es-DO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const cancelUrl = appt.cancel_token
        ? `${siteUrl}/cancelar/${appt.cancel_token}`
        : "#";
      const isPro = proBusinessIds.has(appt.business_id as string);

      // --- Email (todos los planes) ---
      const { data: existingEmail } = await supabase
        .from("sent_reminders")
        .select("appointment_id")
        .eq("appointment_id", appt.id)
        .eq("channel", "email")
        .maybeSingle();

      if (!existingEmail && client?.email) {
        const html = reminderEmailHtml({
          businessName: business?.name ?? "",
          clientName: client.full_name ?? "",
          serviceName: service?.name ?? "",
          date: dateLabel,
          startTime: appt.start_time as string,
          endTime: appt.end_time as string,
          cancelUrl,
        });

        const { error: emailError } = await resend.emails.send({
          from: "Agendalo <notifications@agendalo.com>",
          to: client.email,
          subject: `Recordatorio: tu cita mañana con ${business?.name ?? "nosotros"}`,
          html,
        });

        if (emailError) {
          failed++;
          errors.push(`email ${appt.id}: ${emailError.message}`);
        } else {
          await supabase
            .from("sent_reminders")
            .insert({ appointment_id: appt.id, channel: "email" });
          sentEmail++;
        }
      } else {
        skipped++;
      }

      // --- SMS (solo plan Pro + Twilio configurado + toggle activo) ---
      if (twilioReady && isPro && client?.phone && business?.sms_reminders_enabled && twilioSmsNumber) {
        const messageBody = renderTemplate(business?.reminder_message_template, {
          clientName: client.full_name ?? "",
          businessName: business?.name ?? "",
          serviceName: service?.name ?? "",
          date: dateLabel,
          startTime: appt.start_time as string,
        });

        const { data: existingSms } = await supabase
          .from("sent_reminders")
          .select("appointment_id")
          .eq("appointment_id", appt.id)
          .eq("channel", "sms")
          .maybeSingle();

        if (!existingSms) {
          const result = await sendTwilioMessage({
            accountSid: twilioAccountSid,
            apiKeySid: twilioApiKeySid,
            apiKeySecret: twilioApiKeySecret,
            to: normalizePhone(client.phone),
            from: twilioSmsNumber,
            body: messageBody,
          });
          if (result.ok) {
            await supabase
              .from("sent_reminders")
              .insert({ appointment_id: appt.id, channel: "sms" });
            sentSms++;
          } else {
            failed++;
            errors.push(`sms ${appt.id}: ${result.error}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sentEmail,
        sentSms,
        skipped,
        failed,
        twilioReady,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("CRON_ERR", err);
    const errorObj = err as { message?: string; name?: string };
    return errorResponse(
      `msg=${errorObj?.message ?? ""} name=${errorObj?.name ?? ""} str=${String(err)}`,
      corsHeaders
    );
  }
});

function errorResponse(msg: string, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function reminderEmailHtml(data: {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  cancelUrl: string;
}): string {
  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background-color:#f9fafb;font-family:Inter,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr><td style="background-color:#059669;padding:24px 32px;text-align:center;"><h1 style="margin:0;color:#ffffff;font-size:20px;">Recordatorio de cita</h1></td></tr>
            <tr><td style="padding:32px;">
              <p style="margin:0 0 8px;color:#374151;">Hola <strong>${data.clientName}</strong>,</p>
              <p style="margin:0 0 24px;color:#6b7280;">Te recordamos que tienes una cita mañana con <strong>${data.businessName}</strong>.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;border-radius:8px;padding:16px;">
                <tr><td style="padding:8px 16px;color:#6b7280;font-size:14px;">Servicio</td><td style="padding:8px 16px;color:#111827;font-weight:600;">${data.serviceName}</td></tr>
                <tr><td style="padding:8px 16px;color:#6b7280;font-size:14px;">Fecha</td><td style="padding:8px 16px;color:#111827;font-weight:600;">${data.date}</td></tr>
                <tr><td style="padding:8px 16px;color:#6b7280;font-size:14px;">Hora</td><td style="padding:8px 16px;color:#111827;font-weight:600;">${data.startTime} - ${data.endTime}</td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr><td align="center" style="padding:8px;">
                  <a href="${data.cancelUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;text-decoration:none;color:#ffffff;background-color:#dc2626;border-radius:6px;">Cancelar cita</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}
