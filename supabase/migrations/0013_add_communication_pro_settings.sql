-- Fase Pro — Módulo 2: Comunicación (WhatsApp/SMS vía Twilio).
-- Preferencias de canal y plantilla de mensaje personalizada por negocio.
alter table public.businesses
  add column if not exists sms_reminders_enabled boolean default false,
  add column if not exists whatsapp_reminders_enabled boolean default false,
  add column if not exists reminder_message_template text;
