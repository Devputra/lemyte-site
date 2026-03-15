// services/gate-worker/src/ip-anomaly.ts
// IP anomaly detector: flag >500km apart, trigger MFA step-up >1000km/h

import type { SupabaseClient } from "@supabase/supabase-js";

interface IpLocation {
  ip: string;
  lat: number;
  lng: number;
  timestamp: Date;
}

/**
 * Calculate great-circle distance between two points (Haversine formula).
 * Returns distance in kilometers.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check IP anomaly for a user.
 *
 * Rules (from PRD §8.1):
 * - 2+ IPs >500 km apart within 2 hours → flag account
 * - Implied speed >1000 km/h → mandatory MFA challenge
 * - Audit log entry written for all detections
 *
 * @param userId - The user to check
 * @param currentIp - Current login IP
 * @param currentLocation - Geo-resolved lat/lng (from IP geolocation service)
 * @param supabase - Admin Supabase client
 */
export async function checkIpAnomaly(
  userId: string,
  currentIp: string,
  currentLocation: { lat: number; lng: number } | null,
  supabase: SupabaseClient
): Promise<{
  flagged: boolean;
  requireMfa: boolean;
  distanceKm: number | null;
  impliedSpeedKmh: number | null;
}> {
  if (!currentLocation) {
    return { flagged: false, requireMfa: false, distanceKm: null, impliedSpeedKmh: null };
  }

  // Look up recent audit log entries for this user's IP logins (last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

  const { data: recentLogs } = await supabase
    .from("gate.audit_log" as any)
    .select("ip_address, detail, created_at")
    .eq("user_id", userId)
    .eq("action", "LOGIN")
    .gte("created_at", twoHoursAgo)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recentLogs || recentLogs.length === 0) {
    // First login in window — record and return clean
    await writeAuditEntry(supabase, userId, currentIp, currentLocation, "LOGIN");
    return { flagged: false, requireMfa: false, distanceKm: null, impliedSpeedKmh: null };
  }

  // Check each previous login for distance
  let maxDistance = 0;
  let maxSpeed = 0;

  for (const log of recentLogs) {
    const prevLocation = log.detail as { lat?: number; lng?: number } | null;
    if (!prevLocation?.lat || !prevLocation?.lng) continue;
    if (String(log.ip_address) === currentIp) continue; // Same IP, skip

    const distance = haversineKm(
      prevLocation.lat,
      prevLocation.lng,
      currentLocation.lat,
      currentLocation.lng
    );

    const timeDiffHours =
      (Date.now() - new Date(log.created_at).getTime()) / (1000 * 3600);
    const speed = timeDiffHours > 0 ? distance / timeDiffHours : 0;

    if (distance > maxDistance) maxDistance = distance;
    if (speed > maxSpeed) maxSpeed = speed;
  }

  const flagged = maxDistance > 500;
  const requireMfa = maxSpeed > 1000;

  if (flagged || requireMfa) {
    // Write abuse flag
    await supabase.from("gate.abuse_flags" as any).insert({
      user_id: userId,
      flag_type: requireMfa ? "MFA_REQUIRED" : "IP_ANOMALY",
      detail: {
        current_ip: currentIp,
        current_location: currentLocation,
        max_distance_km: Math.round(maxDistance),
        implied_speed_kmh: Math.round(maxSpeed),
      },
    });

    // Write audit log
    await writeAuditEntry(supabase, userId, currentIp, currentLocation, "IP_ANOMALY_DETECTED");
  } else {
    await writeAuditEntry(supabase, userId, currentIp, currentLocation, "LOGIN");
  }

  return {
    flagged,
    requireMfa,
    distanceKm: maxDistance > 0 ? Math.round(maxDistance) : null,
    impliedSpeedKmh: maxSpeed > 0 ? Math.round(maxSpeed) : null,
  };
}

async function writeAuditEntry(
  supabase: SupabaseClient,
  userId: string,
  ip: string,
  location: { lat: number; lng: number },
  action: string
): Promise<void> {
  await supabase.from("gate.audit_log" as any).insert({
    user_id: userId,
    action,
    resource: "gate.session",
    detail: { lat: location.lat, lng: location.lng },
    ip_address: ip,
  });
}
