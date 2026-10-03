// src/app/admin/system/page.tsx — one page to watch every service Lemyte depends on (admins only; others get 404).
// Data comes from src/lib/admin/system.ts; every check is read-only and runs fresh on each visit.
import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site/SiteChrome";
import { Container } from "@/components/site/ui";
import { requireAdmin } from "@/lib/admin/guard";
import {
  type Card,
  type Status,
  backupCard,
  emailCard,
  githubCard,
  mailchimpCard,
  paymentsCard,
  redisCard,
  s3Card,
  siteCard,
  supabaseCard,
  vercelCard,
} from "@/lib/admin/system";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "System — Lemyte", robots: { index: false, follow: false } };

const DOT: Record<Status, string> = { ok: "bg-emerald-500", warn: "bg-amber-500", error: "bg-rose-600", off: "bg-zinc-300" };
const WORD: Record<Status, string> = { ok: "OK", warn: "Check", error: "Problem", off: "Not connected" };
const TEXT: Record<Status, string> = { ok: "text-emerald-700", warn: "text-amber-700", error: "text-rose-700", off: "text-zinc-500" };

function Pill({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${TEXT[status]}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} aria-hidden />
      {WORD[status]}
    </span>
  );
}

function ServiceCard({ c }: { c: Card }) {
  return (
    <section id={c.id} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{c.title}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">{c.summary}</p>
        </div>
        <Pill status={c.status} />
      </div>
      {c.error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{c.error}</p>}
      {c.rows.length > 0 && (
        <dl className="mt-4 flex-1 divide-y divide-zinc-100 border-t border-zinc-100">
          {c.rows.map((r) => (
            <div key={r.label} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <dt className="text-zinc-600">{r.label}</dt>
                <dd className={`text-right font-medium tabular-nums ${r.status && r.status !== "ok" ? TEXT[r.status] : "text-ink"}`}>{r.value}</dd>
              </div>
              {r.note && <p className="mt-0.5 text-xs leading-5 text-zinc-500">{r.note}</p>}
            </div>
          ))}
        </dl>
      )}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-3">
        {c.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="text-sm text-brand underline underline-offset-2">
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export default async function SystemPage() {
  await requireAdmin();
  const started = Date.now();
  const [supa, site, vercel, github, redis, s3, payments, mailchimp, email] = await Promise.all([
    supabaseCard(),
    siteCard(),
    vercelCard(),
    githubCard(),
    redisCard(),
    s3Card(),
    paymentsCard(),
    mailchimpCard(),
    emailCard(),
  ]);
  const cards: Card[] = [site, supa.card, payments, backupCard(supa.stats), redis, s3, vercel, github, email, mailchimp];
  const problems = cards.filter((c) => c.status === "error");
  const checks = cards.filter((c) => c.status === "warn");
  const top = supa.stats?.top_queries ?? [];

  return (
    <>
      <SiteHeader />
      <Container className="space-y-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">System</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Every service Lemyte runs on, checked live just now ({((Date.now() - started) / 1000).toFixed(1)} s).{" "}
              <Link href="/admin/metrics" className="text-brand underline underline-offset-2">Business metrics</Link> ·{" "}
              <Link href="/admin/analytics" className="text-brand underline underline-offset-2">Visitors</Link>
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border px-5 py-4 ${
            problems.length ? "border-rose-200 bg-rose-50" : checks.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className={`font-semibold ${problems.length ? "text-rose-800" : checks.length ? "text-amber-800" : "text-emerald-800"}`}>
            {problems.length
              ? `${problems.length} problem${problems.length > 1 ? "s" : ""} need attention: ${problems.map((c) => c.title).join(", ")}`
              : checks.length
                ? `Everything is running. Worth a look: ${checks.map((c) => c.title).join(", ")}`
                : "All systems are running normally"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <ServiceCard key={c.id} c={c} />
          ))}
        </div>

        {top.length > 0 && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="font-semibold text-ink">Busiest database queries</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Since {supa.stats?.stats_since ? new Date(supa.stats.stats_since).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "?"}.
              A script stuck in a loop shows up here as one query with a huge call count (that is how the 1 Oct egress spike looked).
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Calls</th>
                    <th className="py-2 pr-4 font-medium">Total time</th>
                    <th className="py-2 font-medium">Query</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {top.map((q, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 tabular-nums">{Number(q.calls).toLocaleString("en-IN")}</td>
                      <td className="py-2 pr-4 tabular-nums">{(Number(q.ms) / 1000).toFixed(0)} s</td>
                      <td className="py-2 font-mono text-xs text-zinc-600">{q.query}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
