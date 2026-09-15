-- Daily appointment reminders (24h before).
--
-- 1. Ensure pg_net is enabled (used to call the Edge Function asynchronously).
-- 2. Create a pg_cron job that calls the `appointment-reminders` Edge Function
--    every day at 09:00 local server time.
--
-- The Edge Function itself is at supabase/functions/appointment-reminders and
-- is protected by the `x-cron-secret` header.

CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-appointment-reminders-daily') THEN
    PERFORM cron.schedule(
      'send-appointment-reminders-daily',
      '0 9 * * *',
      $$
        select net.http_post(
          url:='https://qjrnhcexzbrqntappvga.supabase.co/functions/v1/appointment-reminders',
          headers:='{"Content-Type":"application/json","x-cron-secret":"agendalo-cron-reminder-secret-2026"}'::jsonb,
          body:='{}'::jsonb,
          timeout_milliseconds:=30000
        )
      $$
    );
  END IF;
END $$;
