// src/app/gate/demo/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Calculator, Clock3, MonitorCheck } from "lucide-react";

const demoPoints = [
  ["No payment", "Start without buying a plan."],
  ["Exam feel", "Timer, palette, calculator, MCQ/MSQ/NAT flow."],
  ["Report preview", "Submit and see how review feels."],
  ["24h cooldown", "Demo access is rate-limited to keep abuse low."],
];

export default function GateDemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startDemo() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gate/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DEMO" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? `Failed to start demo (${res.status})`);
      }

      router.push(`/gate/attempt/${data.attemptId}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to start demo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white">
      <section className="border-b border-zinc-200 bg-zinc-50 px-4 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-[#193bc8]/20 bg-[#193bc8]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">
              Free Diagnostic Demo
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              Try the GATE mock interface before making a serious plan.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              This is not a sales gimmick. Use the demo to check the attempt flow, question palette, timer, calculator, rendering, and report experience before you pay.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={startDemo}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#193bc8]/20 transition hover:bg-[#102b9f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Starting Demo…" : "Start Free Demo"}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
              <Link
                href="/gate/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-black text-zinc-950 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
              >
                View Plans
              </Link>
            </div>

            {error ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/70">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <Clock3 className="h-6 w-6 text-[#193bc8]" />
                <div className="mt-4 text-3xl font-black">30</div>
                <p className="text-sm font-semibold text-zinc-500">minutes</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <MonitorCheck className="h-6 w-6 text-[#193bc8]" />
                <div className="mt-4 text-3xl font-black">10</div>
                <p className="text-sm font-semibold text-zinc-500">questions</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <Calculator className="h-6 w-6 text-[#193bc8]" />
                <div className="mt-4 text-3xl font-black">NAT</div>
                <p className="text-sm font-semibold text-zinc-500">supported</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <BarChart3 className="h-6 w-6 text-[#193bc8]" />
                <div className="mt-4 text-3xl font-black">Report</div>
                <p className="text-sm font-semibold text-zinc-500">after submit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-4">
          {demoPoints.map(([title, copy]) => (
            <div key={title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-zinc-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-black text-amber-950">Use this correctly.</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Do not judge your full preparation from a short demo. Use it to verify product quality and attempt flow. For real improvement, use practice tests, topic-wise PYQs, and full reports.
          </p>
        </div>
      </section>
    </div>
  );
}
