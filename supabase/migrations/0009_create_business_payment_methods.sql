-- Business payment method configuration.
-- Lets a business enable/disable payment methods (PayPal, transfer) and
-- configure transfer details shown to clients on the public booking page.
CREATE TABLE IF NOT EXISTS public.business_payment_methods (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('paypal', 'transfer')),
  is_enabled boolean NOT NULL DEFAULT true,
  bank_name text,
  account_holder text,
  account_number text,
  transfer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, type)
);

ALTER TABLE public.business_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage own payment methods"
ON public.business_payment_methods
FOR ALL
USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
)
WITH CHECK (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

-- Public read access so the booking page can show transfer details.
CREATE POLICY "Public can read payment methods"
ON public.business_payment_methods
FOR SELECT
USING (true);
