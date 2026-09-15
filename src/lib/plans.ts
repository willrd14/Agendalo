import type { SupabaseClient } from "@supabase/supabase-js";

export type BusinessPlan = "basic" | "pro" | null;

export const TRIAL_DAYS = 14;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Gets the active plan for a business based on its current subscription.
 * Returns `null` when there is no active subscription.
 */
export async function getActiveBusinessPlan(
  supabase: SupabaseClient,
  businessId: string
): Promise<BusinessPlan> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("business_id", businessId)
    .in("status", ["active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.plan as BusinessPlan) ?? null;
}

export function isProPlan(plan: BusinessPlan): boolean {
  return plan === "pro";
}

export interface PayPalEligibility {
  allowed: boolean;
  plan: BusinessPlan;
  /** True when access comes from the free trial (no paid subscription yet). */
  onTrial: boolean;
  /** When the trial ends (only meaningful when onTrial is true). */
  trialEndsAt: string | null;
}

/**
 * Determines whether a business is allowed to collect online payments via
 * PayPal.
 *
 * Rules:
 * - A business with an active **pro** subscription is allowed.
 * - A business with an active **basic** subscription is NOT allowed (online
 *   payments are a Pro feature).
 * - A business **without** an active subscription is allowed during a free
 *   trial window of 14 days from its creation.
 */
export async function getPayPalEligibility(
  supabase: SupabaseClient,
  business: { id: string; created_at?: string | null }
): Promise<PayPalEligibility> {
  const plan = await getActiveBusinessPlan(supabase, business.id);

  if (plan === "pro") {
    return { allowed: true, plan, onTrial: false, trialEndsAt: null };
  }

  if (plan === "basic") {
    return { allowed: false, plan, onTrial: false, trialEndsAt: null };
  }

  const createdAt = business.created_at
    ? new Date(business.created_at).getTime()
    : null;

  if (createdAt && !Number.isNaN(createdAt)) {
    const trialEndsAt = new Date(createdAt + TRIAL_MS);
    const onTrial = Date.now() < trialEndsAt.getTime();
    if (onTrial) {
      return {
        allowed: true,
        plan: null,
        onTrial: true,
        trialEndsAt: trialEndsAt.toISOString(),
      };
    }
  }

  return { allowed: false, plan: null, onTrial: false, trialEndsAt: null };
}
