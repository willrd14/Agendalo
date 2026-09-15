-- Expand allowed subscription statuses to include PayPal approval lifecycle.
-- 'approval_pending' is set when a subscription is created but before the
-- buyer approves, 'expired'/'deleted' come from the PayPal webhook.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'cancelled', 'past_due', 'approval_pending', 'expired', 'deleted'));
