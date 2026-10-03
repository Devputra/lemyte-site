// src/lib/admin/analytics.ts — data for /admin/analytics (gate.analytics_report + account emails).
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type Report = {
  totals: { visitors: number; sessions: number; pageviews: number; clicks: number; engaged_sessions: number; avg_engaged_s: number; signed_in_visitors: number };
  daily: { day: string; visitors: number; sessions: number; pageviews: number; engaged: number }[];
  pages: { path: string; views: number; visitors: number; avg_engaged_s: number; avg_scroll: number | null; reach_75: number | null }[];
  clicks: { label: string; path: string; target: string | null; clicks: number; visitors: number }[];
  sources: { source: string; sessions: number; engaged: number }[];
  devices: { name: string; sessions: number }[];
  countries: { name: string; sessions: number }[];
  sessions: { started: string; visitor_id: string; user_id: string | null; entry: string | null; source: string; device: string | null; country: string | null; pageviews: number; clicks: number; engaged_s: number; pages: string[] | null }[];
  users: { user_id: string; sessions: number; pageviews: number; clicks: number; engaged_s: number; last_seen: string }[];
};

export async function getAnalytics(days: number): Promise<Report & { emails: Map<string, string> }> {
  const { data, error } = await supabaseAdmin.schema("gate").rpc("analytics_report", { p_days: days });
  if (error) throw error;
  const report = data as Report;

  // Emails for signed-in visitors (only the ones that appear in the report).
  const wanted = new Set([...report.users.map((u) => u.user_id), ...report.sessions.map((s) => s.user_id).filter(Boolean)] as string[]);
  const emails = new Map<string, string>();
  for (let page = 1; wanted.size > emails.size; page++) {
    const { data: list, error: e } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (e) throw e;
    for (const u of list.users) if (wanted.has(u.id) && u.email) emails.set(u.id, u.email);
    if (list.users.length < 1000) break;
  }
  return { ...report, emails };
}
