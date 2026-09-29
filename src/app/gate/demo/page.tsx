// src/app/gate/demo/page.tsx — free demo test (no account needed).
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { buttonClass, Container, Eyebrow, type } from "@/components/site/ui";
import { safeJson } from "@/lib/fetch-helpers";

const FACTS = [
  ["10", "General Aptitude questions"],
  ["30", "minutes on the clock"],
  ["₹0", "no account or card needed"],
];

const WHAT = [
  "The same exam screen as every Lemyte test: timer, question palette, mark for review and calculator",
  "MCQ, MSQ and numerical-answer questions",
  "A full report when you submit, with the correct answers and worked solutions",
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
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error ?? `Couldn't start the demo (${res.status}).`);
      router.push(`/gate/attempt/${data.attemptId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't start the demo. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-white">
      <Container className="grid gap-14 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Eyebrow>Free demo</Eyebrow>
          <h1 className={`${type.display} mt-4`}>Try a short GATE test, free.</h1>
          <p className={`${type.lead} mt-6 max-w-xl`}>
            Ten General Aptitude questions from real GATE papers, on the same screen you&apos;ll use for full tests. When
            you submit, you get your score and a full report.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={startDemo} disabled={loading} className={buttonClass({ size: "lg" })}>
              {loading ? "Starting…" : "Start the demo"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
            <Link href="/gate/pricing" className={buttonClass({ variant: "secondary", size: "lg" })}>
              See plans
            </Link>
          </div>
          {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <p className="mt-5 text-sm text-zinc-500">
            You can take the demo once every 24 hours. It works best on a laptop or desktop.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 p-6 sm:p-8">
          <dl className="grid grid-cols-3 gap-4 border-b border-zinc-100 pb-6">
            {FACTS.map(([v, l]) => (
              <div key={l}>
                <dt className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{v}</dt>
                <dd className="mt-1 text-sm leading-5 text-zinc-500">{l}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm font-medium text-ink">What you&apos;ll see</p>
          <ul className="mt-3 space-y-3">
            {WHAT.map((w) => (
              <li key={w} className="flex gap-3 text-[15px] leading-relaxed text-zinc-600">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={2} /> {w}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-zinc-100 pt-5 text-sm leading-6 text-zinc-500">
            A 10-question test is a sample, not a measure of your preparation. For that, take a full past paper.
          </p>
        </div>
      </Container>
    </div>
  );
}
