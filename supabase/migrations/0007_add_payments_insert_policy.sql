-- Allow business owners to insert payment records for their business.
-- Backs the "Registrar pago" action in the appointments manager and the
-- /payments dashboard.

CREATE POLICY "Business owners can insert own payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT businesses.id FROM businesses WHERE businesses.owner_id = auth.uid()
    )
  );
