-- Add cancel_token column to appointments for public cancellation via email link
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancel_token TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_cancel_token
  ON public.appointments(cancel_token);
