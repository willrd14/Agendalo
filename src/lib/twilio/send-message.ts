/**
 * Cliente mínimo de Twilio (SMS) usando fetch directo a la API
 * REST — sin dependencia del SDK de npm, funciona igual en Next.js (Node)
 * y en la Supabase Edge Function (Deno).
 *
 * Autenticación: se usa un API Key (TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET)
 * en vez del Auth Token principal — es la práctica recomendada por Twilio
 * porque un API Key se puede revocar sin invalidar la cuenta completa.
 */

export interface TwilioCredentials {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
}

export interface SendMessageResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

function authHeader(creds: TwilioCredentials): string {
  const raw = `${creds.apiKeySid}:${creds.apiKeySecret}`;
  // btoa existe tanto en Deno/edge runtime como en el navegador; en Node
  // usamos Buffer si está disponible para evitar problemas con UTF-8.
  if (typeof Buffer !== "undefined") {
    return `Basic ${Buffer.from(raw).toString("base64")}`;
  }
  return `Basic ${btoa(raw)}`;
}

async function sendTwilioMessage(
  creds: TwilioCredentials,
  params: { to: string; from: string; body: string }
): Promise<SendMessageResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;

  const form = new URLSearchParams({
    To: params.to,
    From: params.from,
    Body: params.body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: data?.message ?? `Twilio respondió ${res.status}`,
      };
    }

    return { ok: true, sid: data.sid };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red con Twilio",
    };
  }
}

/** Normaliza un número a formato E.164 básico (agrega +1 si parece dominicano/US de 10 dígitos). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function sendSms(
  creds: TwilioCredentials,
  fromNumber: string,
  to: string,
  body: string
): Promise<SendMessageResult> {
  return sendTwilioMessage(creds, {
    to: normalizePhone(to),
    from: fromNumber,
    body,
  });
}


/** Variables disponibles para la plantilla de mensaje personalizada. */
export interface ReminderTemplateData {
  clientName: string;
  businessName: string;
  serviceName: string;
  date: string;
  startTime: string;
}

export const DEFAULT_REMINDER_TEMPLATE =
  "Hola {{cliente}}, te recordamos tu cita con {{negocio}} para {{servicio}} el {{fecha}} a las {{hora}}. ¡Te esperamos!";

export function renderReminderTemplate(
  template: string | null | undefined,
  data: ReminderTemplateData
): string {
  const tpl = template && template.trim() ? template : DEFAULT_REMINDER_TEMPLATE;
  return tpl
    .replaceAll("{{cliente}}", data.clientName)
    .replaceAll("{{negocio}}", data.businessName)
    .replaceAll("{{servicio}}", data.serviceName)
    .replaceAll("{{fecha}}", data.date)
    .replaceAll("{{hora}}", data.startTime);
}
