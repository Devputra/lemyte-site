// src/app/gate/page.tsx
import "katex/dist/katex.min.css";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  Clock3,
  FileText,
  Target,
  Trophy,
} from "lucide-react";

const pillars = [
  {
    icon: Clock3,
    title: "Exam-like attempts",
    copy: "Timed practice with GATE-style question flow, palette behaviour, MCQ/MSQ/NAT handling, and submission discipline.",
  },
  {
    icon: BookOpenCheck,
    title: "PYQ-first practice",
    copy: "Start with previous-year question patterns before chasing random difficulty. Build recognition, then build speed.",
  },
  {
    icon: Target,
    title: "Calibrated difficulty",
    copy: "Standard practice first. Harder mocks should expose weakness, not distort reality or destroy confidence.",
  },
  {
    icon: BarChart3,
    title: "Ruthless reports",
    copy: "Score, accuracy, wrong attempts, negative marks lost, section leakage, and question-level review after submission.",
  },
];

const modes = [
  ["Free Demo", "Feel the simulator before committing. Timer, palette, calculator, question rendering, and report flow."],
  ["Practice Tests", "Use structured mocks to build test temperament without leaderboard pressure."],
  ["Topic-wise PYQ", "Attack weak areas directly. Pick a topic, choose count, start a focused practice attempt."],
  ["Ranked Mocks", "One counted attempt. Treat it like an exam hall, then compare your performance."],
];

const reportRows = [
  ["Score", "42.67 / 100", "Your raw exam output."],
  ["Accuracy", "61%", "Correct answers among attempted questions."],
  ["Negative marks lost", "3.33", "Marks leaked through risky MCQ attempts."],
  ["Weakest sections", "CN · DB · TOC", "Where your next revision should start."],
];

export default function GateLandingPage() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden border-b border-zinc-200 bg-[radial-gradient(circle_at_top_right,rgba(25,59,200,0.11),transparent_34%),linear-gradient(to_bottom,#ffffff,#f7f7f8)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex rounded-full border border-[#193bc8]/20 bg-[#193bc8]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">
              GATE CS Practice Engine
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              GATE CS practice without illusion.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              IIT-level competition is real. Your preparation should not be blind. Lemyte gives you calibrated mocks, PYQ practice, exam-like attempts, and reports that show exactly where your marks are leaking.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/gate/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#193bc8]/20 transition hover:bg-[#102b9f]"
              >
                Start Free Diagnostic Demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/gate/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-black text-zinc-900 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
              >
                View Plans
              </Link>
            </div>
            <p className="mt-4 text-xs font-medium text-zinc-500">
              No credit card for demo. Best experienced on desktop/laptop.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-200/80">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8ca0ff]">Sample Report</p>
                  <h2 className="mt-1 text-xl font-black">Marks Leakage Map</h2>
                </div>
                <div className="rounded-full bg-[#193bc8] px-3 py-1 text-xs font-black">DEMO</div>
              </div>

              <div className="mt-5 grid gap-3">
                {reportRows.map(([label, value, help]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</p>
                        <p className="mt-1 text-lg font-black text-white">{value}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-[#8ca0ff]" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{help}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#193bc8] p-4 text-sm font-bold leading-6 text-white">
                Next move: revise DB normalization + CN fragmentation, then retake a 30-minute topic practice set.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">The reality</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">
            GATE is not won by passive learning. It is won by measured correction.
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            Random practice gives random confidence. Lemyte is designed around a tighter loop: attempt under time, review every leak, identify the next topic, and repeat with intent.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((item) => (
            <div key={item.title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <item.icon className="h-7 w-7 text-[#193bc8]" />
              <h3 className="mt-5 text-lg font-black text-zinc-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">Training modes</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">
                Use the right pressure at the right stage.
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                Students get nervous when platforms confuse difficulty with usefulness. Lemyte keeps the purpose clear: demo to feel the interface, practice to build skill, ranked mocks to test readiness.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {modes.map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <h3 className="font-black text-zinc-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-8 text-white md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8ca0ff]">Built for signal</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                No fake motivation. No blind confidence. No vague dashboard.
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                The product promise is simple: take one test, understand why marks were lost, and know what to do next.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                "Question review with explanation support",
                "Section summary and accuracy tracking",
                "Negative-marking leakage visibility",
                "Topic-wise PYQ practice path",
                "Ranked attempts for serious benchmarking",
              ].map((point) => (
                <div key={point} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold">
                  <CheckCircle2 className="h-5 w-5 text-[#8ca0ff]" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 text-center">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-200/70">
          <BrainCircuit className="mx-auto h-10 w-10 text-[#193bc8]" />
          <h2 className="mt-4 text-3xl font-black tracking-tight text-zinc-950">
            Start with one diagnostic attempt.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            Do not guess your preparation level. Attempt, submit, review, and let the report expose the next move.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/gate/demo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-6 py-3 text-sm font-black text-white hover:bg-[#102b9f]">
              Start Free Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/gate/practice" className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 text-sm font-black text-zinc-950 hover:border-zinc-950">
              Explore Practice <FileText className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
