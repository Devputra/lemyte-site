// src/lib/admin/system.ts — health and usage of every service Lemyte runs on, for /admin/system.
//
// One function per service. Each returns a card: a status (ok / warn / error / off when not configured), rows of
// label + value (+ note), and a link to that service's own dashboard. Everything here is read-only, and every check
// has its own time limit so one slow service can't hold up the page.
//
// What needs extra keys (optional, add in Vercel → Settings → Environment Variables):
//   VERCEL_TOKEN  recent deployments and their status        (vercel.com/account/tokens, read access)
//   GITHUB_TOKEN  latest commit when the repo is private, and Dependabot security alerts
//                 (github.com/settings/tokens, fine-grained: this repo, Contents + Dependabot alerts read-only)
// Supabase egress and billing are only in the Supabase dashboard: the Management API key that could read them is
// kept on the owner's computer only, never on Vercel.
import "server-only";
import { HeadBucketCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";

import { redisHealth } from "@/lib/gate/redis";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Status = "ok" | "warn" | "error" | "off";
export type Row = { label: string; value: string; note?: string; status?: Status };
export type Card = { id: string; title: string; status: Status; summary: string; rows: Row[]; links: { label: string; href: string }[]; error?: string };

const SUPABASE_PROJECT = "rqmgmlhltjylgkvgnokh";
const SUPABASE_ORG = "lxjjmjxmutluuvaiefla";
const VERCEL_PROJECT = "prj_9QYVMDOM11OTUgburBtSrRbuEb1n";
const VERCEL_TEAM = "team_Ye09nssEmMDM2tlYaw5cHh0Y";
const GITHUB_REPO = "Devputra/lemyte-site";
const DB_LIMIT = 500 * 1e6; // Free Plan database size

export const fmtBytes = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n} B`;
export function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 129600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}
const worst = (xs: Status[]): Status =>
  xs.includes("error") ? "error" : xs.includes("warn") ? "warn" : xs.every((x) => x === "off") && xs.length ? "off" : "ok";

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms / 1000}s`)), ms))]);
}
async function timedFetch(url: string, init: RequestInit = {}, ms = 8000) {
  return fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(ms) });
}
/** Runs a check; any thrown error becomes a red card instead of breaking the page. */
async function card(base: Omit<Card, "status" | "summary" | "rows">, run: () => Promise<Omit<Card, keyof typeof base>>): Promise<Card> {
  try {
    return { ...base, ...(await withTimeout(run(), 12000)) };
  } catch (e) {
    return { ...base, status: "error", summary: "Check failed", rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------- Supabase
type Stats = {
  db_bytes: number;
  tables: { name: string; bytes: number; rows: number }[];
  users: { total: number; new_7d: number; unconfirmed: number; active_30d: number };
  connections: number;
  max_connections: number;
  rls_off: string[];
  anon_definer_functions: string[];
  anon_policies: string[];
  top_queries: { calls: number; rows: number; ms: number; query: string }[];
  stats_since: string | null;
  heartbeats: Record<string, { at: string; ok: boolean; detail: Record<string, unknown> | null }>;
};

export async function supabaseCard(): Promise<{ card: Card; stats: Stats | null }> {
  let stats: Stats | null = null;
  const c = await card(
    {
      id: "supabase",
      title: "Supabase",
      links: [
        { label: "Usage & egress", href: `https://supabase.com/dashboard/org/${SUPABASE_ORG}/usage` },
        { label: "Project", href: `https://supabase.com/dashboard/project/${SUPABASE_PROJECT}` },
        { label: "Security advisor", href: `https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/advisors/security` },
      ],
    },
    async () => {
      const t0 = Date.now();
      const health = await timedFetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      });
      const authMs = Date.now() - t0;
      const { data, error } = await supabaseAdmin.schema("gate").rpc("admin_system_stats");
      if (error) throw new Error(error.message);
      stats = data as Stats;
      const s = stats;
      const dbPct = (s.db_bytes / DB_LIMIT) * 100;
      const security = [...s.rls_off.map((t) => `row security off: ${t}`), ...s.anon_definer_functions.map((f) => `public can run: ${f}`), ...s.anon_policies.map((p) => `public policy: ${p}`)];
      const rows: Row[] = [
        {
          label: "API & sign-in",
          value: health.status === 200 ? `Up · ${authMs} ms` : health.status === 402 ? "RESTRICTED (402)" : `HTTP ${health.status}`,
          status: health.status === 200 ? "ok" : "error",
          note: health.status === 402 ? "Supabase has restricted the project (quota). Upgrade or wait for the cycle reset." : undefined,
        },
        { label: "Database size", value: `${fmtBytes(s.db_bytes)} of 500 MB`, note: `${dbPct.toFixed(1)}% of the Free Plan limit`, status: dbPct > 80 ? "warn" : "ok" },
        { label: "Connections", value: `${s.connections} of ${s.max_connections}`, status: s.connections > s.max_connections * 0.8 ? "warn" : "ok" },
        { label: "Accounts", value: `${s.users.total}`, note: `${s.users.new_7d} new this week · ${s.users.active_30d} signed in last 30 days · ${s.users.unconfirmed} unconfirmed` },
        {
          label: "Security self-check",
          value: security.length ? `${security.length} issue${security.length > 1 ? "s" : ""}` : "No issues",
          note: security.length ? security.join(" · ") : "Row security on everywhere; nothing callable or readable by the public key",
          status: security.length ? "error" : "ok",
        },
        { label: "Egress (data sent out)", value: "See Supabase usage", note: "Free Plan: 5 GB per cycle. Only shown in the Supabase dashboard (link below)." },
      ];
      return { status: worst(rows.map((r) => r.status ?? "ok")), summary: health.status === 200 ? "Database and sign-in are up" : "Supabase is not answering normally", rows };
    },
  );
  return { card: c, stats };
}

// ---------------------------------------------------------------- Backups (owner's computer → heartbeat)
export function backupCard(stats: Stats | null): Card {
  const hb = stats?.heartbeats?.backup;
  const links = [{ label: "How backups work", href: `https://github.com/${GITHUB_REPO}/blob/main/scripts/backup/README.md` }];
  if (!hb) return { id: "backup", title: "Database backups", status: "warn", summary: "No backup has reported yet", rows: [], links };
  const hours = (Date.now() - new Date(hb.at).getTime()) / 3.6e6;
  const d = hb.detail ?? {};
  const status: Status = !hb.ok ? "error" : hours > 50 ? "error" : hours > 30 ? "warn" : "ok";
  return {
    id: "backup",
    title: "Database backups",
    status,
    summary: !hb.ok ? "The last backup FAILED" : hours > 30 ? "Backups have stopped running" : "Nightly backup is running",
    rows: [
      { label: "Last backup", value: ago(hb.at), note: new Date(hb.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), status },
      ...(hb.ok
        ? [
            { label: "Contents", value: `${d.rows ?? "?"} rows in ${d.tables ?? "?"} tables`, note: `${fmtBytes(Number(d.bytes ?? 0))} on disk · ${d.downloaded_tables ?? "?"} tables changed and re-downloaded` },
            { label: "Copies kept", value: `${d.kept ?? "?"} of 30`, note: "On the owner's computer, ~/lemyte-backups. Copy them off the laptop weekly." },
          ]
        : [{ label: "Error", value: String(d.error ?? "unknown"), status: "error" as Status }]),
    ],
    links,
  };
}

// ---------------------------------------------------------------- Vercel
export async function vercelCard(): Promise<Card> {
  return card(
    { id: "vercel", title: "Vercel (hosting)", links: [{ label: "Vercel dashboard", href: "https://vercel.com/dashboard" }] },
    async () => {
      const sha = process.env.VERCEL_GIT_COMMIT_SHA;
      const rows: Row[] = [
        { label: "Live version", value: sha ? sha.slice(0, 7) : "unknown", note: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0] },
        { label: "Region", value: process.env.VERCEL_REGION ?? "unknown", note: "bom1 = Mumbai (next to the database)" },
      ];
      const token = process.env.VERCEL_TOKEN;
      if (!token) {
        rows.push({ label: "Deployments", value: "Not connected", note: "Add VERCEL_TOKEN to see recent deployments and failures", status: "off" });
        return { status: "ok", summary: "Site is serving this page", rows };
      }
      const r = await timedFetch(`https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT}&teamId=${VERCEL_TEAM}&limit=6`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Vercel API ${r.status}`);
      const { deployments } = (await r.json()) as { deployments: { state: string; created: number; target: string | null; meta?: { githubCommitMessage?: string } }[] };
      const failed = deployments.filter((d) => d.state === "ERROR");
      for (const d of deployments.slice(0, 4)) {
        rows.push({
          label: `${d.target === "production" ? "Production" : "Preview"} · ${ago(new Date(d.created).toISOString())}`,
          value: d.state === "READY" ? "Ready" : d.state === "ERROR" ? "Failed" : d.state.toLowerCase(),
          note: d.meta?.githubCommitMessage?.split("\n")[0]?.slice(0, 90),
          status: d.state === "ERROR" ? "error" : d.state === "READY" ? "ok" : "warn",
        });
      }
      return {
        status: deployments[0]?.state === "ERROR" ? "error" : failed.length ? "warn" : "ok",
        summary: deployments[0]?.state === "ERROR" ? "The latest deployment failed" : "Deployments are healthy",
        rows,
      };
    },
  );
}

// ---------------------------------------------------------------- GitHub
export async function githubCard(): Promise<Card> {
  return card(
    { id: "github", title: "GitHub (code)", links: [{ label: "Repository", href: `https://github.com/${GITHUB_REPO}` }] },
    async () => {
      const token = process.env.GITHUB_TOKEN;
      const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "lemyte-admin" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const rows: Row[] = [];
      const [repoRes, commitRes] = await Promise.all([
        timedFetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers }),
        timedFetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/main`, { headers }),
      ]);
      if (repoRes.status === 404 && !token)
        return { status: "off", summary: "Repository is private", rows: [{ label: "Details", value: "Not connected", note: "Add GITHUB_TOKEN to see commits and security alerts", status: "off" }] };
      if (!repoRes.ok) throw new Error(`GitHub API ${repoRes.status}`);
      const repo = (await repoRes.json()) as { private: boolean };
      rows.push({
        label: "Visibility",
        value: repo.private ? "Private" : "PUBLIC",
        note: repo.private ? undefined : "Anyone can read the code. Settings → General → Change visibility",
        status: repo.private ? "ok" : "warn",
      });
      let deployedMatches: boolean | null = null;
      if (commitRes.ok) {
        const c = (await commitRes.json()) as { sha: string; commit: { message: string; committer: { date: string } } };
        const live = process.env.VERCEL_GIT_COMMIT_SHA;
        deployedMatches = live ? live === c.sha : null;
        rows.push({ label: "Latest commit", value: `${c.sha.slice(0, 7)} · ${ago(c.commit.committer.date)}`, note: c.commit.message.split("\n")[0].slice(0, 90) });
        if (deployedMatches !== null)
          rows.push({ label: "Live site", value: deployedMatches ? "Up to date" : "Behind main", note: deployedMatches ? undefined : "A newer commit is not live yet (still deploying, or the deploy failed)", status: deployedMatches ? "ok" : "warn" });
      }
      if (token) {
        const a = await timedFetch(`https://api.github.com/repos/${GITHUB_REPO}/dependabot/alerts?state=open&per_page=100`, { headers });
        if (a.ok) {
          const alerts = (await a.json()) as { security_advisory: { severity: string } }[];
          const bad = alerts.filter((x) => ["high", "critical"].includes(x.security_advisory.severity)).length;
          rows.push({ label: "Security alerts", value: alerts.length ? `${alerts.length} open (${bad} high/critical)` : "None open", status: bad ? "warn" : "ok" });
        } else rows.push({ label: "Security alerts", value: "Unavailable", note: `Token lacks Dependabot read access (${a.status})`, status: "off" });
      } else rows.push({ label: "Security alerts", value: "Not connected", note: "Add GITHUB_TOKEN to see Dependabot alerts", status: "off" });
      return { status: worst(rows.map((r) => r.status ?? "ok").filter((s) => s !== "off")), summary: repo.private ? "Code is private" : "Code is public", rows };
    },
  );
}

// ---------------------------------------------------------------- Mailchimp
export async function mailchimpCard(): Promise<Card> {
  const key = process.env.MAILCHIMP_API_KEY;
  const dc = process.env.MAILCHIMP_DC;
  const list = process.env.MAILCHIMP_LIST_ID;
  const links = [{ label: "Mailchimp audience", href: `https://${dc ?? "us1"}.admin.mailchimp.com/audience/` }];
  if (!key || !dc || !list) return { id: "mailchimp", title: "Mailchimp (newsletter)", status: "off", summary: "Not configured", rows: [], links };
  return card({ id: "mailchimp", title: "Mailchimp (newsletter)", links }, async () => {
    const auth = { Authorization: `Basic ${Buffer.from(`anystring:${key}`).toString("base64")}` };
    const base = `https://${dc}.api.mailchimp.com/3.0/lists/${list}`;
    const [l, p] = await Promise.all([
      timedFetch(`${base}?fields=name,stats`, { headers: auth }),
      timedFetch(`${base}/members?status=pending&count=1&fields=total_items`, { headers: auth }),
    ]);
    if (!l.ok) throw new Error(`Mailchimp API ${l.status}`);
    const { name, stats } = (await l.json()) as { name: string; stats: { member_count: number; unsubscribe_count: number; cleaned_count: number; last_sub_date: string } };
    const pending = p.ok ? ((await p.json()) as { total_items: number }).total_items : null;
    return {
      status: "ok",
      summary: `${stats.member_count} subscribed`,
      rows: [
        { label: "Audience", value: name },
        { label: "Subscribed", value: String(stats.member_count), note: stats.last_sub_date ? `Last sign-up ${ago(stats.last_sub_date)}` : undefined },
        { label: "Waiting to confirm", value: pending === null ? "?" : String(pending), note: "Signed up but haven't clicked the confirmation email (double opt-in)" },
        { label: "Unsubscribed · bounced", value: `${stats.unsubscribe_count} · ${stats.cleaned_count}` },
      ],
    };
  });
}

// ---------------------------------------------------------------- Redis
export async function redisCard(): Promise<Card> {
  return card(
    { id: "redis", title: "Redis (live test sessions)", links: [{ label: "Redis Cloud console", href: "https://cloud.redis.io/" }] },
    async () => {
      const h = await redisHealth();
      const memPct = h.maxMemory ? (h.usedMemory / h.maxMemory) * 100 : null;
      const rows: Row[] = [
        { label: "Response time", value: `${h.pingMs} ms`, status: h.pingMs > 1000 ? "warn" : "ok" },
        { label: "Memory", value: h.maxMemory ? `${fmtBytes(h.usedMemory)} of ${fmtBytes(h.maxMemory)}` : fmtBytes(h.usedMemory), note: memPct !== null ? `${memPct.toFixed(0)}% used` : undefined, status: memPct !== null && memPct > 80 ? "warn" : "ok" },
        { label: "Test sessions in memory", value: String(h.attempts), note: `Running tests plus ones finished in the last few hours (kept 6 h) · ${h.keys} keys in total` },
        { label: "Evicted keys", value: String(h.evicted), note: h.evicted ? "Redis dropped data because memory was full: live tests may have been lost" : "None (good)", status: h.evicted ? "error" : "ok" },
        { label: "Server", value: `Redis ${h.version ?? "?"}`, note: `Up ${h.uptimeDays} days${h.clients ? ` · ${h.clients} connections` : ""}` },
      ];
      return { status: worst(rows.map((r) => r.status ?? "ok")), summary: "Test sessions store is up", rows };
    },
  );
}

// ---------------------------------------------------------------- AWS S3 (question images)
const s3Inventory = unstable_cache(
  async () => {
    const bucket = process.env.GATE_S3_BUCKET!;
    const s3 = new S3Client({ region: process.env.GATE_S3_REGION });
    let token: string | undefined;
    let objects = 0, bytes = 0, pages = 0;
    const webps = new Set<string>();
    const images: string[] = [];
    do {
      const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 }));
      for (const o of r.Contents ?? []) {
        objects += 1;
        bytes += o.Size ?? 0;
        const k = o.Key ?? "";
        if (k.endsWith(".webp")) webps.add(k.slice(0, -5));
        else if (/\.(png|jpe?g|gif)$/i.test(k)) images.push(k.replace(/\.[^.]+$/, ""));
      }
      token = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (token && ++pages < 30); // bounded: at most 30,000 objects counted
    const missing = images.filter((k) => !webps.has(k));
    return {
      objects, bytes, webp: webps.size, originals: images.length, missing: missing.length,
      missingSample: missing.slice(0, 3), capped: Boolean(token), at: new Date().toISOString(),
    };
  },
  ["admin-s3-inventory-v2"],
  { revalidate: 3600 },
);

export async function s3Card(): Promise<Card> {
  const bucket = process.env.GATE_S3_BUCKET;
  const region = process.env.GATE_S3_REGION;
  const links = [{ label: "S3 console", href: `https://${region}.console.aws.amazon.com/s3/buckets/${bucket}?region=${region}` }];
  if (!bucket || !region) return { id: "s3", title: "AWS S3 (question images)", status: "off", summary: "Not configured", rows: [], links };
  return card({ id: "s3", title: "AWS S3 (question images)", links }, async () => {
    const s3 = new S3Client({ region });
    const t0 = Date.now();
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    const headMs = Date.now() - t0;
    // Privacy check from the outside: an unsigned request must be refused.
    const open = await timedFetch(`https://${bucket}.s3.${region}.amazonaws.com/`, {}, 5000);
    const inv = await s3Inventory();
    const missingWebp = inv.missing;
    const rows: Row[] = [
      { label: "Bucket", value: `Reachable · ${headMs} ms`, note: `${bucket} (${region})` },
      {
        label: "Public access",
        value: open.status === 403 ? "Private" : `OPEN (HTTP ${open.status})`,
        note: open.status === 403 ? "Unsigned requests are refused; images load only through signed links" : "Anyone can list the bucket: block public access in the S3 console",
        status: open.status === 403 ? "ok" : "error",
      },
      { label: "Stored", value: `${inv.objects.toLocaleString("en-IN")} files · ${fmtBytes(inv.bytes)}`, note: `${inv.originals} originals, ${inv.webp} WebP copies${inv.capped ? " (count capped)" : ""} · counted ${ago(inv.at)}` },
      { label: "Missing WebP copies", value: String(missingWebp), note: missingWebp ? `These load the slower original (e.g. ${inv.missingSample.join(", ")}). Run scripts/gate-content/webp-sync.mjs` : "Every image has a fast WebP copy", status: missingWebp ? "warn" : "ok" },
    ];
    return { status: worst(rows.map((r) => r.status ?? "ok")), summary: open.status === 403 ? "Images are private and reachable" : "Bucket is publicly readable", rows };
  });
}

// ---------------------------------------------------------------- Payments (Razorpay, from our own records)
export async function paymentsCard(): Promise<Card> {
  return card(
    { id: "payments", title: "Payments (Razorpay)", links: [{ label: "Razorpay dashboard", href: "https://dashboard.razorpay.com/" }] },
    async () => {
      const g = supabaseAdmin.schema("gate");
      const since30 = new Date(Date.now() - 30 * 86400e3).toISOString();
      const [orders, lastEvent, passes] = await Promise.all([
        g.from("payment_orders").select("id, status, amount_inr, created_at").gte("created_at", since30),
        g.from("payment_events").select("event_type, status, received_at").order("received_at", { ascending: false }).limit(1).maybeSingle(),
        g.from("access_passes").select("payment_order_id"),
      ]);
      if (orders.error) throw new Error(orders.error.message);
      const paid = (orders.data ?? []).filter((o) => o.status === "CAPTURED");
      const withPass = new Set((passes.data ?? []).map((p) => p.payment_order_id));
      const paidNoAccess = paid.filter((o) => !withPass.has(o.id));
      const live = (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_");
      const ev = lastEvent.data;
      const rows: Row[] = [
        { label: "Mode", value: live ? "Live" : "TEST keys", status: live ? "ok" : "warn", note: live ? undefined : "Real customers can't pay with test keys" },
        { label: "Paid (30 days)", value: `${paid.length} · ₹${paid.reduce((n, o) => n + Number(o.amount_inr), 0).toLocaleString("en-IN")}`, note: `${(orders.data ?? []).filter((o) => o.status === "CREATED").length} checkouts opened but not paid` },
        {
          label: "Paid but no access",
          value: String(paidNoAccess.length),
          note: paidNoAccess.length ? "A student paid and has no plan. Fix by hand or refund today." : "Every paid order has its plan",
          status: paidNoAccess.length ? "error" : "ok",
        },
        {
          label: "Last webhook from Razorpay",
          value: ev ? `${ev.event_type} · ${ago(ev.received_at)}` : "Never received",
          note: ev
            ? `processed: ${ev.status}`
            : paid.length
              ? "Payments work without it, but refunds made in Razorpay won't remove access. Razorpay → Settings → Webhooks: add https://lemyte.com/api/webhooks/razorpay (payment.captured, order.paid, payment.failed, refund.processed)"
              : "Arrives after each payment or refund",
          status: ev?.status === "FAILED" || (!ev && paid.length) ? "warn" : "ok",
        },
      ];
      return { status: worst(rows.map((r) => r.status ?? "ok")), summary: `${paid.length} paid in 30 days`, rows };
    },
  );
}

// ---------------------------------------------------------------- Email (SMTP)
export async function emailCard(): Promise<Card> {
  const host = process.env.SMTP_HOST;
  const links = [{ label: "Supabase email settings", href: `https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/auth/smtp` }];
  if (!host) return { id: "email", title: "Email", status: "off", summary: "SMTP not configured", rows: [], links };
  return card({ id: "email", title: "Email", links }, async () => {
    const nodemailer = await import("nodemailer");
    const t = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
    });
    const t0 = Date.now();
    await t.verify(); // connects and logs in; sends nothing
    const ms = Date.now() - t0;
    t.close();
    return {
      status: "ok",
      summary: "Site email server accepts our login",
      rows: [
        { label: "Site SMTP", value: `Login OK · ${ms} ms`, note: `${host} as ${process.env.SMTP_FROM ?? process.env.SMTP_USER}` },
        { label: "Sign-up & reset emails", value: "Sent by Supabase", note: `Use this same server in Supabase → Authentication → Emails → SMTP (host ${host}, user ${process.env.SMTP_USER}); Supabase's built-in sender allows only ~2 emails an hour` },
      ],
    };
  });
}

// ---------------------------------------------------------------- Website
export async function siteCard(): Promise<Card> {
  return card({ id: "site", title: "Website", links: [{ label: "lemyte.com", href: "https://lemyte.com" }] }, async () => {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lemyte.com";
    const checks = await Promise.all(
      ["/", "/gate", "/gate/pricing", "/api/gate/tests/demo"].map(async (p) => {
        const t0 = Date.now();
        const r = await timedFetch(base + p, { method: "GET", headers: { "User-Agent": "lemyte-admin-check bot" } }, 8000);
        return { p, status: r.status, ms: Date.now() - t0 };
      }),
    );
    const rows: Row[] = checks.map((c) => ({ label: c.p, value: `${c.status} · ${c.ms} ms`, status: c.status === 200 ? (c.ms > 3000 ? "warn" : "ok") : "error" }));
    return { status: worst(rows.map((r) => r.status ?? "ok")), summary: rows.every((r) => r.status === "ok") ? "All key pages respond" : "Some pages are slow or failing", rows };
  });
}
