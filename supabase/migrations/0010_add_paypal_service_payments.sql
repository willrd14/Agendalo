-- PayPal service payments (one-time checkout, not subscription).
-- Adds a USD conversion rate to business_payment_methods for the paypal row
-- and a payment_sessions table to hold checkout context while PayPal
-- approval/capture completes (guests have no session, so sessions are managed
-- server-side via the service role).
ALTER TABLE public.business_payment_methods
  ADD COLUMN IF NOT EXISTS paypal_conversion_rate numeric;

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id uuid NOT NULL,
  client_name text,
  client_email text,
  client_phone text,
  notes text,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  cancel_token text,
  amount_dop numeric NOT NULL,
  currency text NOT NULL DEFAULT 'DOP',
  amount_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled')),
  paypal_order_id text,
  paypal_capture_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own payment sessions"
ON public.payment_sessions
FOR SELECT
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can update own payment sessions"
ON public.payment_sessions
FOR UPDATE
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
