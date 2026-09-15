-- sent_reminders: tracks which appointments already received a reminder,
-- so the daily cron never double-sends.
CREATE TABLE IF NOT EXISTS public.sent_reminders (
  appointment_id UUID PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sent_reminders ENABLE ROW LEVEL SECURITY;

-- No client-facing policies: this table is only written by the Edge Function
-- using the service role, so RLS stays closed by default.
