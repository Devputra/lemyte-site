// src/app/page.tsx — Lemyte home: what assessment is, why it works, how Lemyte does it, and the GATE product.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenCheck, CheckCircle2, ClipboardList, LineChart, ListChecks, Medal, Timer } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { TrialButton } from "@/components/site/AccessCta";
import { ButtonLink, Card, Container, Eyebrow, SectionHeader, type } from "@/components/site/ui";
import { fmtInt, GATE_SUBJECTS, GATE_TOTALS } from "@/lib/gate/catalog";

export const metadata: Metadata = {
  title: "Lemyte — Practice tests for competitive exams",
  description:
    "Exam-style online tests built from official past papers and marked the way the real exam marks them. Starting with GATE.",
};

const KINDS = [
  {
    when: "Before you start",
    name: "Diagnostic",
    text: "Shows where you are starting from, so you don't spend weeks on topics you already know.",
  },
  {
    when: "While you prepare",
    name: "Formative",
    text: "Short, regular checks that decide what you study next. Most practice on Lemyte is this kind.",
  },
  {
    when: "Close to the exam",
    name: "Summative",
    text: "A full-length paper under exam conditions that tells you how ready you are.",
  },
];

const WHY = [
  {
    title: "Recalling beats rereading",
    text: "Pulling an answer out of memory strengthens it far more than reading your notes again. Psychologists call this the testing effect, and it is one of the most reliable findings in learning research.",
  },
  {
    title: "You can only fix what you can see",
    text: "A score tells you how you did. A breakdown by topic and question tells you what to do next, which is the part that actually moves your marks.",
  },
  {
    title: "Exam technique is a skill too",
    text: "Pacing three hours, handling negative marks and using an on-screen calculator all take practice. A mock is a much better place to learn them than the exam hall.",
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: "Pick a test",
    text: "A full past paper, a practice test, or ten questions from one topic. Every question comes from an official paper.",
  },
  {
    icon: Timer,
    title: "Take it like the real exam",
    text: "Countdown timer, question palette, mark for review and an on-screen calculator. MCQ, MSQ and numerical answers work the way they do on exam day.",
  },
  {
    icon: ListChecks,
    title: "Get marked the official way",
    text: "Marks and negative marks follow the exam's own scheme and answer key, including questions where marks were awarded to everyone.",
  },
  {
    icon: LineChart,
    title: "Review, then practise",
    text: "Compare each answer with the correct one and read the worked solution. Your weakest topics move to the top of your practice list.",
  },
];

const GETS = [
  { icon: Medal, title: "A score you can trust", text: "Marked against the official answer key, with negative marking applied." },
  { icon: BarChart3, title: "Accuracy by topic", text: "See which topics are costing you marks and which ones are already safe." },
  { icon: BookOpenCheck, title: "Worked solutions", text: "Every question has a step-by-step explanation, not just the final answer." },
  { icon: LineChart, title: "A progress tracker", text: "Coverage, accuracy, daily streak and level for each paper you prepare for." },
  { icon: CheckCircle2, title: "Your rank", text: "In ranked tests, see how you compare with everyone else who took the same paper." },
  { icon: ListChecks, title: "What to practise next", text: "One click starts ten questions from the topic you most need to work on." },
];

const MODES = [
  { name: "Free demo", text: "A short test to try the exam screen and the report. No payment needed." },
  { name: "Full PYQ papers", text: "Every official paper as a complete 3-hour test. Take each one as often as you like." },
  { name: "Topic practice", text: "Ten to thirty past questions from a single topic, timed at about two minutes each." },
  { name: "Ranked tests", text: "Scheduled tests with one counted attempt, so you can compare yourself with other students." },
];

const FAQ = [
  {
    q: "Where do the questions come from?",
    a: "From official GATE question papers. Each one is checked against the published answer key, figures are taken from the original paper, and every question has a worked solution.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes. The demo test is free and you don't need a card. You can also create an account and look around before choosing a plan.",
  },
  {
    q: "Does my plan renew automatically?",
    a: "No. Plans are one-time payments for 1, 3 or 6 months. If a plan isn't right for you, you can get a full refund within 7 days as long as you have started no more than 2 tests.",
  },
  {
    q: "Which GATE papers are covered?",
    a: `${GATE_SUBJECTS.map((s) => s.name).join(", ")}. More papers are being added.`,
  },
];

export default function HomePage() {
  return (
    <div className="bg-white text-ink">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="border-b border-zinc-100">
          <Container className="grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Eyebrow>Assessments for competitive exams</Eyebrow>
              <h1 className={`${type.display} mt-4`}>Practice tests that show you what to study next.</h1>
              <p className={`${type.lead} mt-6 max-w-xl`}>
                Lemyte runs exam-style online tests and turns every attempt into a clear list of what to work on. We are
                starting with GATE: {fmtInt(GATE_TOTALS.questions)} questions from {GATE_TOTALS.papers} official papers,
                marked exactly the way GATE marks them.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <TrialButton size="lg" arrow paidLabel="Start a PYQ paper" paidHref="/gate/practice" />
                <ButtonLink href="#how-it-works" variant="secondary" size="lg">
                  How it works
                </ButtonLink>
              </div>
                          </div>
            <ReportPreview />
          </Container>
        </section>

        {/* What is an assessment */}
        <section id="what" className="py-20 sm:py-24">
          <Container>
            <SectionHeader
              eyebrow="What an assessment is"
              title="A test with a purpose"
              lead="An assessment is a structured way to find out what someone knows and can do. A school exam is one kind; a short quiz after a lecture is another. What matters is the purpose: honest evidence of where you stand right now."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {KINDS.map((k) => (
                <Card key={k.name}>
                  <p className="text-sm text-zinc-500">{k.when}</p>
                  <h3 className={`${type.h3} mt-1`}>{k.name}</h3>
                  <p className={`${type.body} mt-3`}>{k.text}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Why it matters */}
        <section id="why" className="border-y border-zinc-100 bg-zinc-50/70 py-20 sm:py-24">
          <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeader
              eyebrow="Why it matters"
              title="Testing yourself is how learning sticks"
              lead="Reading, watching lectures and making notes all feel productive. Tests are what show whether any of it will hold up on exam day."
            />
            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {WHY.map((w) => (
                <div key={w.title} className="py-6">
                  <h3 className={type.h3}>{w.title}</h3>
                  <p className={`${type.body} mt-2`}>{w.text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
          <Container>
            <SectionHeader
              eyebrow="How Lemyte's assessment works"
              title="From one test to a clear next step"
              lead="Every attempt follows the same four steps, whether it is a full paper or ten questions on a single topic."
            />
            <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl border border-zinc-200 p-6">
                  <div className="flex items-center justify-between">
                    <s.icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
                    <span className="text-sm font-medium tabular-nums text-zinc-400">0{i + 1}</span>
                  </div>
                  <h3 className={`${type.h3} mt-5`}>{s.title}</h3>
                  <p className={`${type.body} mt-2`}>{s.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* What you get */}
        <section id="what-you-get" className="border-t border-zinc-100 py-20 sm:py-24">
          <Container>
            <SectionHeader eyebrow="What you get" title="Everything you need after a test, in one place" />
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {GETS.map((g) => (
                <div key={g.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <g.icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{g.title}</h3>
                    <p className={`${type.body} mt-1`}>{g.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* GATE product */}
        <section id="gate" className="bg-ink py-20 text-white sm:py-24">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-medium text-brand-100">Our first product</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">GATE assessment</h2>
                <p className="mt-4 text-lg leading-relaxed text-zinc-300">
                  Built for students preparing for GATE. Take real past papers on a screen that works like the exam, get
                  marked the official way, and spend your remaining time on the topics that need it.
                </p>
                <dl className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-2">
                  {[
                    [fmtInt(GATE_TOTALS.questions), "past-paper questions"],
                    [String(GATE_TOTALS.papers), "official papers"],
                    [String(GATE_TOTALS.subjects), "GATE subjects"],
                    [GATE_TOTALS.years, "years covered"],
                  ].map(([v, l]) => (
                    <div key={l} className="border-l border-zinc-700 pl-4">
                      <dt className="text-2xl font-semibold tabular-nums">{v}</dt>
                      <dd className="mt-1 text-sm text-zinc-400">{l}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="space-y-8">
                <div className="overflow-hidden rounded-2xl border border-zinc-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Subject</th>
                        <th className="px-4 py-3 text-right font-medium">Questions</th>
                        <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Years</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {GATE_SUBJECTS.map((s) => (
                        <tr key={s.code}>
                          <td className="px-4 py-3 text-zinc-100">{s.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtInt(s.questions)}</td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-zinc-400 sm:table-cell">{s.years}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {MODES.map((m) => (
                    <div key={m.name}>
                      <h3 className="font-semibold">{m.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">{m.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-6">
                  <ButtonLink href="/gate" size="lg">
                    Explore GATE assessment <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                  <p className="text-sm text-zinc-400">Plans from ₹299 a month · one-time payment</p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 sm:py-24">
          <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeader eyebrow="Questions" title="Good to know" />
            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold text-ink">
                    {f.q}
                    <span className="text-xl leading-none text-zinc-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className={`${type.body} mt-3 max-w-2xl`}>{f.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        {/* About */}
        <section id="about" className="border-t border-zinc-100 bg-zinc-50/70 py-20">
          <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeader eyebrow="About Lemyte" title="Knowledge is the one asset no one can take from you" />
            <div className={`${type.lead} space-y-4`}>
              <p>
                Lemyte is an education company based in Chennai, built by DXOCTAGON (OPC) Private Limited. We make
                assessments that help students prepare with evidence instead of guesswork.
              </p>
              <p>
                GATE is our first product. We check every question against the official paper and answer key before it
                goes live, and we would rather have fewer questions than wrong ones.
              </p>
              <p>
                <Link href="/contact" className="font-medium text-brand hover:text-brand-700">
                  Get in touch →
                </Link>
              </p>
            </div>
          </Container>
        </section>

        {/* Closing CTA */}
        <section className="py-20 sm:py-24">
          <Container className="text-center">
            <h2 className={type.h2}>See where you stand today.</h2>
            <p className={`${type.lead} mx-auto mt-4 max-w-xl`}>Take the free demo test and look at your report. It takes a few minutes.</p>
            <div className="mt-8 flex justify-center gap-3">
              <TrialButton size="lg" paidLabel="Start a PYQ paper" paidHref="/gate/practice" />
              <ButtonLink href="/gate/pricing" variant="secondary" size="lg">
                See plans
              </ButtonLink>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* A static example of a Lemyte report, drawn in HTML so it stays sharp and on-brand. */
function ReportPreview() {
  const topics: [string, number][] = [
    ["Computer Networks", 38],
    ["Databases", 52],
    ["Algorithms", 74],
    ["Discrete Mathematics", 81],
  ];
  return (
    <div className="relative">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(25,59,200,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500">GATE CS · Practice test 4</p>
            <p className="mt-1 font-semibold text-ink">Your result</p>
          </div>
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">Example</span>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4 border-y border-zinc-100 py-5">
          {[
            ["58.33", "Score / 100"],
            ["71%", "Accuracy"],
            ["−2.67", "Negative marks"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-xl font-semibold tabular-nums text-ink">{v}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs font-medium text-zinc-500">Accuracy by topic</p>
        <ul className="mt-3 space-y-3">
          {topics.map(([name, pct]) => (
            <li key={name}>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-700">{name}</span>
                <span className="tabular-nums text-zinc-500">{pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100">
                <div className={`h-full rounded-full ${pct < 50 ? "bg-rose-500" : pct < 75 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
          <p className="text-sm text-ink">
            Next: <span className="font-medium">10 questions on Computer Networks</span>
          </p>
          <ArrowRight className="h-4 w-4 text-brand" />
        </div>
      </div>
    </div>
  );
}
