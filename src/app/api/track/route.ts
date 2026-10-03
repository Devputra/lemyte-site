// src/app/api/track/route.ts — receives first-party analytics events from the Tracker component.
//
// The browser sends anonymous ids (visitor, session) and what happened (page view, click, engaged time).
// Who is signed in is read here from the auth cookie, never trusted from the request body.
// Bots are dropped. Data lands in gate.site_events and is shown on /admin/analytics.
import { NextRequest } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Id = z.string().regex(/^[a-z0-9]{8,40}$/);
const Str = (max: number) => z.string().max(max).optional();
const Event = z.object({
  t: z.enum(["pageview", "click", "engage"]),
  p: z.string().min(1).max(300), // path
  l: Str(120), // click label
  h: Str(300), // click target
  r: Str(500), // referrer
  us: Str(100), // utm_source
  um: Str(100), // utm_medium
  uc: Str(150), // utm_campaign
  ms: z.number().int().min(0).max(3_600_000).optional(), // engaged time
  d: z.number().int().min(0).max(100).optional(), // max % of the page seen
});
const Body = z.object({ v: Id, s: Id, e: z.array(Event).min(1).max(20) });

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor|curl|wget|python|httpclient/i;

function device(ua: string) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(await req.text()));
  } catch {
    return new Response(null, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const { data } = await (await supabaseServer()).auth.getClaims();
    userId = (data?.claims?.sub as string | undefined) ?? null;
  } catch {
    // signed out or expired session: record the visit anonymously
  }

  const country = req.headers.get("x-vercel-ip-country") ?? null;
  const rows = body.e
    .filter((e) => !e.p.startsWith("/admin"))
    .map((e) => ({
      type: e.t,
      visitor_id: body.v,
      session_id: body.s,
      user_id: userId,
      path: e.p,
      label: e.l ?? null,
      target: e.h ?? null,
      referrer: e.r || null,
      utm_source: e.us || null,
      utm_medium: e.um || null,
      utm_campaign: e.uc || null,
      device: device(ua),
      country,
      engaged_ms: e.ms ?? null,
      scroll_pct: e.d ?? null,
    }));
  if (rows.length) {
    const { error } = await supabaseAdmin.schema("gate").from("site_events").insert(rows);
    if (error) console.error("[track] insert failed", error.message);
  }
  return new Response(null, { status: 204 });
}
