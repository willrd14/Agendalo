-- Permite registrar el envío de recordatorios por más de un canal
-- (email, sms, whatsapp) por cada cita, en vez de uno solo.
alter table public.sent_reminders add column if not exists channel text not null default 'email';
alter table public.sent_reminders drop constraint if exists sent_reminders_pkey;
alter table public.sent_reminders add primary key (appointment_id, channel);
