// src/app/admin/metrics/page.tsx — business dashboard (signed-in admins only: ADMIN_EMAILS).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site/SiteChrome";
import { Container } from "@/components/site/ui";
import { type DayRow, getMetrics } from "@/lib/admin/metrics";
import { fmtInr, fmtInt } from "@/lib/gate/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Metrics — Lemyte",
  robots: { index: false, follow: false },
};

const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-zinc-400">{note}</p>}
    </div>
  );
}

function Bars({
  rows,
  pick,
  label,
  fmt = fmtInt,
}: {
  rows: DayRow[];
  pick: (r: DayRow) => number;
  label: string;
  fmt?: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.map(pick));
  const total = rows.reduce((n, r) => n + pick(r), 0);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm tabular-nums text-zinc-500">{fmt(total)}</p>
      </div>
      <div className="mt-4 flex h-24 items-end gap-[3px]">
        {rows.map((r) => (
          <div
            key={r.day}
            title={`${r.day}: ${fmt(pick(r))}`}
            className="flex-1 rounded-t bg-brand/80 hover:bg-brand"
            style={{ height: `${Math.max(2, (pick(r) / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-zinc-400">
        <span>{rows[0]?.day}</span>
        <span>{rows.at(-1)?.day}</span>
      </div>
    </div>
  );
}

export default async function MetricsPage() {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user?.email || !ADMINS.includes(data.user.email.toLowerCase()))
    notFound();

  const m = await getMetrics(30);
  const { data: qs } = m.suspicious.length
    ? await supabaseAdmin
        .schema("gate")
        .from("question_versions")
        .select("id, pyq_paper_code, markdown_content")
        .in(
          "id",
          m.suspicious.map((s) => s.id),
        )
    : { data: [] };
  const qById = new Map((qs ?? []).map((q) => [q.id as string, q]));

  return (
    <div className="min-h-screen bg-zinc-50 text-ink">
      <SiteHeader />
      <Container className="space-y-8 py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Business metrics
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Last {m.days} days unless stated. Live from the database.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Students (all time)"
            value={fmtInt(m.students.total)}
            note={`${m.students.newInWindow} new · ${m.students.activeInWindow} took a test`}
          />
          <Stat
            label="Revenue (all time)"
            value={fmtInr(m.revenue.totalInr)}
            note={`${fmtInr(m.revenue.windowInr)} in the last ${m.days} days`}
          />
          <Stat
            label="Paying students"
            value={fmtInt(m.revenue.payers)}
            note={`${m.revenue.conversionPct}% of sign-ups · ${m.revenue.activePasses} ${m.revenue.activePasses === 1 ? "plan" : "plans"} active now`}
          />
          <Stat
            label="Orders"
            value={fmtInt(m.revenue.orders)}
            note={`${m.revenue.failed} failed ${m.revenue.failed === 1 ? "payment" : "payments"}`}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Bars
            rows={m.series}
            pick={(r) => r.signups}
            label="Sign-ups per day"
          />
          <Bars
            rows={m.series}
            pick={(r) => r.attempts}
            label="Tests started per day"
          />
          <Bars
            rows={m.series}
            pick={(r) => r.revenue}
            label="Revenue per day"
            fmt={fmtInr}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium">Tests by type</p>
            <p className="text-xs text-zinc-400">
              Completion = submitted ÷ started. Low completion means students
              give up midway.
            </p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th className="py-1 font-medium">Type</th>
                  <th className="text-right font-medium">Started</th>
                  <th className="text-right font-medium">Submitted</th>
                  <th className="text-right font-medium">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 tabular-nums">
                {m.byMode.map((r) => (
                  <tr key={r.mode}>
                    <td className="py-2">{r.mode}</td>
                    <td className="text-right">{r.started}</td>
                    <td className="text-right">{r.submitted}</td>
                    <td className="text-right">{r.completion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-zinc-500">
              {m.guestDemos} demos were taken without an account.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium">Tests started by subject</p>
            <ul className="mt-4 space-y-2 text-sm">
              {m.subjects.length === 0 && (
                <li className="text-zinc-400">No tests in this period.</li>
              )}
              {m.subjects.map(([code, n]) => (
                <li key={code} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 font-medium">{code}</span>
                  <span
                    className="h-2 rounded-full bg-brand"
                    style={{ width: `${(n / m.subjects[0][1]) * 70}%` }}
                  />
                  <span className="tabular-nums text-zinc-500">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium">Questions to check</p>
          <p className="text-xs text-zinc-400">
            Answered by 5+ students and got right by 10% or fewer. Usually a
            hard question — but check the answer key and figures.
            {` ${fmtInt(m.questionsAttempted)} questions have been attempted so far.`}
          </p>
          {m.suspicious.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Nothing flagged yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100 text-sm">
              {m.suspicious.map((s) => {
                const q = qById.get(s.id);
                return (
                  <li key={s.id} className="flex gap-4 py-2">
                    <span className="w-28 shrink-0 font-medium">
                      {q?.pyq_paper_code ?? "—"}
                    </span>
                    <span className="flex-1 truncate text-zinc-600">
                      {String(q?.markdown_content ?? s.id).slice(0, 140)}
                    </span>
                    <span className="shrink-0 tabular-nums text-rose-600">
                      {s.correctPct}% of {s.attempts}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Container>
    </div>
  );
}
