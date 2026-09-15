-- Allow business owners to insert and update their own subscription rows.
-- Needed by the billing start/sync API routes which use the user session
-- (RLS-enforced) client.

CREATE POLICY "Business owners can insert own subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
    )
  );
