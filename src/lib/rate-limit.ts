import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Best-effort client IP extraction. Works behind Vercel/most proxies
 * (`x-forwarded-for`) and falls back to `x-real-ip`. Never throws.
 */
export function getClientIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Simple self-hosted rate limiter for public endpoints that don't have a
 * user session to key off of (email notifications, checkout session
 * creation). Logs the attempt into `rate_limit_log` and counts how many
 * attempts came from the same IP+route in the given window.
 *
 * Intentionally not a distributed/atomic implementation (no external
 * service like Redis) — good enough to blunt basic abuse/spam without
 * adding new infra, per product decision.
 */
export async function isRateLimited(
  supabase: SupabaseClient,
  route: string,
  clientIp: string,
  opts: { limit: number; windowMinutes: number }
): Promise<boolean> {
  if (clientIp === "unknown") {
    // Can't meaningfully rate limit without an IP; don't block legitimate
    // traffic just because a proxy header is missing.
    return false;
  }

  const windowStart = new Date(
    Date.now() - opts.windowMinutes * 60 * 1000
  ).toISOString();

  const { count } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("route", route)
    .eq("client_ip", clientIp)
    .gte("created_at", windowStart);

  await supabase.from("rate_limit_log").insert({ route, client_ip: clientIp });

  return (count ?? 0) >= opts.limit;
}
