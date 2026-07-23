// src/lib/gate/demo.ts

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEMO_RATE_LIMIT_REASON =
  "Demo rate limit exceeded. You can try again in 24 hours.";

export function generateGuestToken(): string {
  return `guest_${crypto.randomBytes(16).toString("hex")}`;
}

export async function enforceDemoRateLimit(
  ip: string | null,
  cookieToken: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 3600 * 1000
  ).toISOString();

  // 1) Check by IP via attempt_metadata -> attempts
  if (ip) {
    const { data: byIp, error: byIpErr } = await supabaseAdmin
      .schema("gate")
      .from("attempt_metadata")
      .select("attempt_id, created_at")
      .eq("client_ip", ip)
      .gte("created_at", twentyFourHoursAgo)
      .limit(5);

    if (byIpErr) {
      console.error("[gate/demo] enforceDemoRateLimit by IP failed", byIpErr);
    }

    if (byIp && byIp.length > 0) {
      const attemptIds = byIp.map((row) => row.attempt_id).filter(Boolean);

      if (attemptIds.length > 0) {
        const { data: attempts, error: attemptsErr } = await supabaseAdmin
          .schema("gate")
          .from("attempts")
          .select("id, status, created_at")
          .in("id", attemptIds)
          .eq("mode", "DEMO")
          .in("status", ["IN_PROGRESS", "SUBMITTED", "EXPIRED"])
          .gte("created_at", twentyFourHoursAgo)
          .limit(1);

        if (attemptsErr) {
          console.error(
            "[gate/demo] enforceDemoRateLimit attempt lookup by IP failed",
            attemptsErr
          );
        }

        if (attempts && attempts.length > 0) {
          return {
            allowed: false,
            reason: DEMO_RATE_LIMIT_REASON,
          };
        }
      }
    }
  }

  // 2) Check by guest cookie token
  if (cookieToken) {
    const { data: byCookie, error: byCookieErr } = await supabaseAdmin
      .schema("gate")
      .from("attempts")
      .select("id, status")
      .eq("guest_token", cookieToken)
      .eq("mode", "DEMO")
      .in("status", ["IN_PROGRESS", "SUBMITTED", "EXPIRED"])
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);

    if (byCookieErr) {
      console.error("[gate/demo] enforceDemoRateLimit by cookie failed", byCookieErr);
    }

    if (byCookie && byCookie.length > 0) {
      return {
        allowed: false,
        reason: DEMO_RATE_LIMIT_REASON,
      };
    }
  }

  return { allowed: true };
}

export async function getDemoTestVersionId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("test_versions")
    .select("id")
    .eq("is_demo", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[gate/demo] getDemoTestVersionId failed", error);
    return null;
  }

  if (!data) {
    console.error("[gate/demo] getDemoTestVersionId returned no rows");
    return null;
  }

  return data.id as string;
}
