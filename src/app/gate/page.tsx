// src/app/gate/page.tsx
"use client";

import Link from "next/link";
import {
  Clock,
  BarChart3,
  Calculator,
  Shield,
  BookOpen,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "180-Minute Timed Simulation",
    desc: "Server-authoritative timer, automatic submission, and realistic exam pressure.",
  },
  {
    icon: Calculator,
    title: "Virtual Scientific Calculator",
    desc: "Built-in React calculator with trig, logs, factorials, memory keys — zero latency.",
  },
  {
    icon: BarChart3,
    title: "Deep Post-Test Analytics",
    desc: "Subject, topic, and sub-topic breakdown. Percentile ranking against first-attempt peers.",
  },
  {
    icon: Shield,
    title: "Exam-Grade Security",
    desc: "One active attempt per account, focus-loss tracking, offline resilience with 180s grace window.",
  },
  {
    icon: BookOpen,
    title: "Verified PYQ Bank",
    desc: "CS/IT questions curated by subject-matter experts with maker-checker governance.",
  },
  {
    icon: Zap,
    title: "Instant Results & Solutions",
    desc: "Scores calculated with GATE-exact negative marking. Solutions unlocked for subscribers.",
  },
];

export default function GateLandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <div className="mx-auto mb-4 inline-block rounded-full border border-[#00A86B]/30 bg-[#00A86B]/5 px-3 py-1 text-xs font-semibold text-[#00A86B] uppercase tracking-wide">
            CS / IT &mdash; MVP Launch
          </div>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            GATE Mock Tests That
            <br />
            <span className="text-[#00A86B]">Feel Like the Real Exam</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            65 questions. 100 marks. 180 minutes. TCS&nbsp;iON-style palette,
            timer, calculator, and submission flow &mdash; built for serious
            GATE&nbsp;CS/IT aspirants.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/gate/demo"
              className="rounded-lg bg-[#00A86B] px-6 py-3 text-base font-semibold text-white shadow hover:bg-[#009060] transition-colors"
            >
              Start Free Demo (10 Questions)
            </Link>
            <Link
              href="/gate/pricing"
              className="rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            No credit card required for demo. 1 free demo every 24 hours.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold">
          Everything You Need to Crack GATE
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-gray-500">
          A full-stack exam simulator, not just a question bank.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <f.icon className="h-6 w-6 text-[#00A86B]" />
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Exam structure */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold">
            CS/IT Paper Structure
          </h2>
          <div className="mt-8 overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Types</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3 font-medium">General Aptitude</td>
                  <td className="px-4 py-3">10</td>
                  <td className="px-4 py-3">15</td>
                  <td className="px-4 py-3">MCQ only</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Core CS/IT + Engg. Math
                  </td>
                  <td className="px-4 py-3">55</td>
                  <td className="px-4 py-3">85</td>
                  <td className="px-4 py-3">MCQ, MSQ, NAT</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3">65</td>
                  <td className="px-4 py-3">100</td>
                  <td className="px-4 py-3">180 min</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            MCQ wrong: &minus;1/3 (1-mark) or &minus;2/3 (2-mark). MSQ &amp;
            NAT: no negative marking.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <h2 className="text-2xl font-bold">Ready to Start Preparing?</h2>
        <p className="mx-auto mt-2 max-w-md text-gray-500">
          Try a 10-question demo for free, or subscribe for unlimited full-length
          mocks with solutions and analytics.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/gate/demo"
            className="rounded-lg bg-[#00A86B] px-6 py-3 font-semibold text-white hover:bg-[#009060] transition-colors"
          >
            Start Free Demo
          </Link>
          <Link
            href="/gate/pricing"
            className="rounded-lg border px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            See Plans
          </Link>
        </div>
      </section>
    </div>
  );
}
