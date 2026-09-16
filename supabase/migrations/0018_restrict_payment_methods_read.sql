-- A-1: business_payment_methods had `FOR SELECT USING (true)`, letting any
-- anonymous request with the anon key read bank account details
-- (account_number/account_holder/bank_name) for every business at once.
--
-- The public booking page no longer queries this table directly with the
-- anon key (see src/app/(public)/[business]/book/page.tsx, which now loads
-- transfer details server-side with the service role for the one business
-- being viewed). RLS can now be locked down to the actual owner + service
-- role, since there is no legitimate anon/authenticated broad-read use case
-- left.

DROP POLICY IF EXISTS "Public can read payment methods" ON public.business_payment_methods;

-- Keep (recreate defensively) the owner-managed policy from 0009; owners can
-- still read/write their own rows via the RLS-enforced client.
DROP POLICY IF EXISTS "Business owners can manage own payment methods" ON public.business_payment_methods;
CREATE POLICY "Business owners can manage own payment methods"
ON public.business_payment_methods
FOR ALL
USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
)
WITH CHECK (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);

-- No anon/public SELECT policy. The service role (used by the booking page
-- Server Component and by the payment API routes) bypasses RLS entirely, so
-- it keeps working without a policy.
