-- Security hardening for the "Módulo Financiero Pro" (deposits + reports).
-- Bundles the fixes from the QA/pentest report that touch RLS policies,
-- table constraints, and a couple of new columns needed by the app code.
--
-- Covers:
--   C-1 Escalada de plan gratis (revoke public write access to subscriptions)
--   A-2 Límites de depósito a nivel de BD (CHECK constraints en businesses)
--   A-3 Rate limiting propio (tabla genérica reutilizada por las rutas de email)
--   QA-7 Reportes: distinguir depósito de pago completo (payments.is_deposit)
--   QA-9 Aplicar el enum deposit_status a appointments.deposit_status

-- ---------------------------------------------------------------------------
-- C-1: revoke the public INSERT/UPDATE policies on subscriptions. Only the
-- service role (used server-side by the billing API routes) may write to
-- this table from now on; the RLS-enforced user session client no longer
-- has write access, closing the "escalate to any plan/status for free" hole.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Business owners can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Business owners can update own subscriptions" ON public.subscriptions;

-- Owners can still read their own subscription rows (used by /billing UI
-- through the RLS-enforced client) but no longer write to them directly.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions' AND policyname = 'Business owners can view own subscriptions'
  ) THEN
    CREATE POLICY "Business owners can view own subscriptions"
      ON public.subscriptions
      FOR SELECT
      TO authenticated
      USING (
        business_id IN (
          SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- A-2: hard limits on deposit configuration at the DB level, in addition to
-- the server-side validation added to /api/settings/deposit.
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_deposit_percentage_check;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_deposit_percentage_check
  CHECK (deposit_percentage > 0 AND deposit_percentage <= 100);

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_deposit_fixed_amount_check;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_deposit_fixed_amount_check
  CHECK (deposit_fixed_amount >= 0);

-- ---------------------------------------------------------------------------
-- A-3: minimal self-hosted rate limiting. `payment_sessions.client_ip` is
-- used to throttle checkout session creation (create / create-deposit);
-- `rate_limit_log` is a small generic table used by the public email
-- notification routes (which have no per-user session to key off of).
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS client_ip text;

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route text NOT NULL,
  client_ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_log_route_ip_created_idx
  ON public.rate_limit_log (route, client_ip, created_at);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only the service role writes/reads this table (API routes use
-- createServiceClient()); no policies are defined for anon/authenticated,
-- so RLS denies them by default.

-- ---------------------------------------------------------------------------
-- QA-7: distinguish deposit payments from full-price payments in reports.
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS is_deposit boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- QA-9: appointments.deposit_status was left as `text` instead of the
-- `deposit_status` enum created in 0011_pro_phase_tables_baseline.sql.
-- Normalize any stray/legacy values first so the cast never fails, then
-- convert the column type.
-- ---------------------------------------------------------------------------
UPDATE public.appointments
SET deposit_status = 'unpaid'
WHERE deposit_status IS NULL
   OR deposit_status NOT IN ('unpaid', 'paid', 'refunded');

ALTER TABLE public.appointments
  ALTER COLUMN deposit_status DROP DEFAULT;

ALTER TABLE public.appointments
  ALTER COLUMN deposit_status TYPE deposit_status
  USING deposit_status::deposit_status;

ALTER TABLE public.appointments
  ALTER COLUMN deposit_status SET DEFAULT 'unpaid'::deposit_status;
