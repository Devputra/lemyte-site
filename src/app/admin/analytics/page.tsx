// src/app/admin/analytics/page.tsx — visitors, engagement and clicks (signed-in admins only: ADMIN_EMAILS).
// Data comes from the first-party Tracker (src/components/site/Tracker.tsx) via gate.analytics_report().
import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site/SiteChrome";
import { Container } from "@/components/site/ui";
import { getAnalytics, type Report } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/guard";
import { fmtInt } from "@/lib/gate/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analytics — Lemyte", robots: { index: false, follow: false } };

const RANGES = [1, 7, 30, 90];
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
const ist = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {note && <p className="mt-1 text-xs text-zinc-400">{note}</p>}
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && <p className="text-xs text-zinc-400">{note}</p>}
      </div>
      <div className="mt-4 overflow-x-auto">{children}</div>
    </section>
  );
}

function Table({ head, rows, right = [] }: { head: string[]; rows: React.ReactNode[][]; right?: number[] }) {
  if (!rows.length) return <p className="text-sm text-zinc-400">No data yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-zinc-500">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`pb-2 pr-4 font-medium ${right.includes(i) ? "text-right" : ""}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={`py-2 pr-4 align-top ${right.includes(j) ? "text-right tabular-nums" : "text-zinc-700"}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Daily({ rows }: { rows: Report["daily"] }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  if (!rows.length) return <p className="text-sm text-zinc-400">No data yet.</p>;
  return (
    <div>
      <div className="flex h-36 items-end gap-1">
        {rows.map((r) => (
          <div key={r.day} className="group relative flex h-full max-w-[48px] flex-1 items-end" title={`${r.day}: ${r.visitors} visitors, ${r.sessions} sessions, ${r.pageviews} page views`}>
            <div className="w-full rounded-t bg-brand/80" style={{ height: `${(r.visitors / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-400">
        <span>{rows[0].day}</span>
        <span>{rows.at(-1)!.day}</span>
      </div>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const days = RANGES.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const r = await getAnalytics(days);
  const t = r.totals;
  const who = (userId: string | null, visitorId: string) =>
    userId ? <span className="font-medium text-ink">{r.emails.get(userId) ?? "Signed-in user"}</span> : <span className="text-zinc-400">Visitor {visitorId.slice(0, 6)}</span>;

  return (
    <div className="min-h-screen bg-zinc-50 text-ink">
      <SiteHeader />
      <Container className="space-y-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Visitors and engagement</h1>
            <p className="mt-1 text-sm text-zinc-500">
              First-party analytics, live. Bots and visitors who ask not to be tracked are excluded.{" "}
              <Link href="/admin/metrics" className="text-brand underline underline-offset-2">Business metrics</Link> · <Link href="/admin/system" className="text-brand underline underline-offset-2">System</Link>
            </p>
          </div>
          <nav className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm">
            {RANGES.map((d) => (
              <Link key={d} href={`/admin/analytics?days=${d}`} className={`px-3 py-1.5 ${d === days ? "bg-ink text-white" : "text-zinc-600 hover:bg-zinc-50"}`}>
                {d === 1 ? "24 h" : `${d} days`}
              </Link>
            ))}
          </nav>
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Visitors" value={fmtInt(t.visitors)} note={`${fmtInt(t.signed_in_visitors)} signed in`} />
          <Stat label="Sessions" value={fmtInt(t.sessions)} note={`${fmtInt(t.pageviews)} page views`} />
          <Stat label="Engagement rate" value={pct(t.engaged_sessions, t.sessions)} note="Sessions with 10 s+ on screen or 2+ pages" />
          <Stat label="Engaged time" value={dur(t.avg_engaged_s)} note={`per session · ${fmtInt(t.clicks)} clicks`} />
        </section>

        <Card title="Visitors per day" note="IST">
          <Daily rows={r.daily} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Pages" note="by views">
            <Table
              head={["Page", "Views", "Visitors", "Avg time", "Scrolled", "Reached 75%"]}
              right={[1, 2, 3, 4, 5]}
              rows={r.pages.map((p) => [
                <span key="p" className="break-all">{p.path}</span>,
                fmtInt(p.views),
                fmtInt(p.visitors),
                dur(p.avg_engaged_s),
                p.avg_scroll === null ? "–" : `${p.avg_scroll}%`,
                p.reach_75 === null ? "–" : `${p.reach_75}%`,
              ])}
            />
          </Card>
          <Card title="Where visitors came from" note="first touch of each session">
            <Table
              head={["Source", "Sessions", "Engaged"]}
              right={[1, 2]}
              rows={r.sources.map((s) => [s.source, fmtInt(s.sessions), pct(s.engaged, s.sessions)])}
            />
          </Card>
        </div>

        <Card title="Clicks" note="buttons and links, by clicks">
          <Table
            head={["Button / link", "On page", "Goes to", "Clicks", "Visitors"]}
            right={[3, 4]}
            rows={r.clicks.map((c) => [
              <span key="l" className="font-medium text-ink">{c.label}</span>,
              <span key="p" className="break-all text-zinc-500">{c.path}</span>,
              <span key="t" className="break-all text-zinc-500">{c.target ?? "–"}</span>,
              fmtInt(c.clicks),
              fmtInt(c.visitors),
            ])}
          />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Devices">
            <Table head={["Device", "Sessions", "Share"]} right={[1, 2]} rows={r.devices.map((d) => [d.name, fmtInt(d.sessions), pct(d.sessions, t.sessions)])} />
          </Card>
          <Card title="Countries">
            <Table head={["Country", "Sessions", "Share"]} right={[1, 2]} rows={r.countries.map((d) => [d.name, fmtInt(d.sessions), pct(d.sessions, t.sessions)])} />
          </Card>
        </div>

        <Card title="Signed-in visitors" note="who used the site in this period">
          <Table
            head={["Account", "Sessions", "Pages", "Clicks", "Time", "Last seen"]}
            right={[1, 2, 3, 4]}
            rows={r.users.map((u) => [who(u.user_id, ""), fmtInt(u.sessions), fmtInt(u.pageviews), fmtInt(u.clicks), dur(u.engaged_s), ist(u.last_seen)])}
          />
        </Card>

        <Card title="Recent sessions" note="latest 60">
          <Table
            head={["Started", "Who", "Source", "Device", "Path through the site", "Clicks", "Time"]}
            right={[5, 6]}
            rows={r.sessions.map((s) => [
              <span key="d" className="whitespace-nowrap text-zinc-500">{ist(s.started)}</span>,
              who(s.user_id, s.visitor_id),
              s.source,
              `${s.device ?? "?"}${s.country ? ` · ${s.country}` : ""}`,
              <span key="p" className="text-xs text-zinc-500">{(s.pages ?? []).join(" → ")}</span>,
              fmtInt(s.clicks),
              dur(s.engaged_s),
            ])}
          />
        </Card>
      </Container>
    </div>
  );
}
