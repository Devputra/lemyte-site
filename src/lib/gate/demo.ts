// src/lib/gate/demo.ts
// Demo rate limiting + guest token helpers

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Generate a guest token for unauthenticated demo attempts.
 */
export function generateGuestToken(): string {
  return `guest_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Enforce demo rate limit: exactly 1 demo attempt per 24h per IP + cookie.
 *
 * @param ip - Client IP address
 * @param cookieToken - Demo cookie value (set in browser)
 * @returns true if rate limit is NOT exceeded (can proceed)
 */
export async function enforceDemoRateLimit(
  ip: string | null,
  cookieToken: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Check by IP
  if (ip) {
    const { data: byIp } = await supabaseAdmin
      .from("gate.attempt_metadata" as any)
      .select("attempt_id")
      .eq("client_ip", ip)
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);

    if (byIp && byIp.length > 0) {
      // Verify it's actually a demo attempt
      const { data: attempt } = await supabaseAdmin
        .from("gate.attempts" as any)
        .select("id")
        .eq("id", byIp[0].attempt_id)
        .eq("mode", "DEMO")
        .maybeSingle();

      if (attempt) {
        return {
          allowed: false,
          reason: "Demo rate limit exceeded. You can try again in 24 hours.",
        };
      }
    }
  }

  // Check by cookie token (stored as guest_token)
  if (cookieToken) {
    const { data: byCookie } = await supabaseAdmin
      .from("gate.attempts" as any)
      .select("id")
      .eq("guest_token", cookieToken)
      .eq("mode", "DEMO")
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);

    if (byCookie && byCookie.length > 0) {
      return {
        allowed: false,
        reason: "Demo rate limit exceeded. You can try again in 24 hours.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Get the demo test version ID.
 * Returns the most recent active demo test version.
 */
export async function getDemoTestVersionId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("gate.test_versions" as any)
    .select("id")
    .eq("is_demo", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}
