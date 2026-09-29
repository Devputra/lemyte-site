// src/app/gate/page.tsx — GATE assessment overview (public).
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Check,
  Clock3,
  Flag,
  LayoutGrid,
} from "lucide-react";

import { TrialButton } from "@/components/site/AccessCta";
import { CountUp, Reveal } from "@/components/motion";
import { ExamScreenScene } from "@/components/motion/scenes";
import { PageHero } from "@/components/site/PageHero";
import { SubjectBar } from "@/components/site/SubjectBar";
import {
  ButtonLink,
  Card,
  Container,
  SectionHeader,
  type,
} from "@/components/site/ui";
import { fmtInr, fmtInt } from "@/lib/gate/catalog";
import { getCatalog } from "@/lib/gate/catalog.server";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600; // numbers and prices come from the database

export async function generateMetadata(): Promise<Metadata> {
  const { totals } = await getCatalog();
  return {
    title: "GATE assessment — Lemyte",
    description: `Take ${totals.papers} official GATE papers as timed tests, marked with the official answer key. Then practise the topics where you lost marks.`,
  };
}

const SCREEN = [
  {
    icon: Clock3,
    title: "Countdown timer",
    text: "Three hours for a full paper. The test submits itself when time runs out.",
  },
  {
    icon: LayoutGrid,
    title: "Question palette",
    text: "See at a glance what you've answered, skipped and marked, and jump to any question.",
  },
  {
    icon: Flag,
    title: "Mark for review",
    text: "Flag a question and come back to it before you submit, just like the real exam.",
  },
  {
    icon: Calculator,
    title: "On-screen calculator",
    text: "Use the calculator on the screen, as you will on exam day.",
  },
];

const modesFor = (papers: number) => [
  {
    name: "Free demo",
    href: "/gate/demo",
    text: "A short General Aptitude test to try the exam screen and the report. No payment or card needed.",
  },
  {
    name: "Full PYQ papers",
    href: "/gate/practice",
    text: `All ${papers} official papers as complete 3-hour tests. Take any paper as many times as you like.`,
  },
  {
    name: "Topic practice",
    href: "/gate/practice/topics",
    text: "Choose one topic and get 5 to 30 past questions from it, timed at about two minutes per question.",
  },
  {
    name: "Ranked tests",
    href: "/gate/ranked",
    text: "Scheduled tests with one counted attempt. Your score is ranked against everyone who took the same test.",
  },
];

const MARKING = [
  ["1-mark MCQ, wrong answer", "−⅓ mark"],
  ["2-mark MCQ, wrong answer", "−⅔ mark"],
  ["MSQ or numerical, wrong answer", "No negative marks"],
  ["MSQ with a partly correct choice", "No marks (no partial credit)"],
  ["Question awarded to all by the institute", "Full marks for everyone"],
];

const REPORT = [
  "Your score out of 100, with marks gained and marks lost to negative marking",
  "Accuracy, and how many questions you attempted, skipped and got wrong",
  "A summary for General Aptitude and for your subject",
  "Every question with your answer, the correct answer and a worked solution",
  "Rank and percentile for ranked tests",
];

const CHECKS = [
  "Question text copied word for word from the official paper",
  "Answer set from the official answer key, including marks-to-all and range answers",
  "Figures and diagrams taken from the original paper",
  "A worked solution for every question, checked against the key",
];

export default async function GateOverviewPage() {
  const { subjects, totals, plans } = await getCatalog();
  return (
    <div className="bg-white text-ink">
      {/* Hero */}
      <PageHero
        eyebrow="GATE assessment"
        title="Prepare for GATE with the real papers."
        lead="Take every recent official GATE paper as a timed test, marked with the official answer key. Your report shows where you lost marks, and topic practice helps you win them back."
        art={<ExamScreenScene />}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <TrialButton
            size="lg"
            arrow
            label="Take the free demo"
            paidLabel="Start a PYQ paper"
            paidHref="/gate/practice"
          />
          <ButtonLink href="/gate/pricing" variant="secondary" size="lg">
            See plans
          </ButtonLink>
        </div>
      </PageHero>
      <section className="border-b border-zinc-100 bg-zinc-50/70">
        <Container>
          <dl className="grid grid-cols-2 gap-6 py-10 sm:grid-cols-4">
            {(
              [
                [totals.questions, "past-paper questions"],
                [totals.papers, "official papers"],
                [totals.subjects, "GATE subjects"],
                [3, "hours per full paper, like the exam"],
              ] as const
            ).map(([v, l]) => (
              <div key={l}>
                <dt className="text-3xl font-semibold tracking-tight">
                  <CountUp to={v} />
                </dt>
                <dd className="mt-1 text-sm text-zinc-500">{l}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Subjects */}
      <section className="py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionHeader
              eyebrow="Subjects"
              title={`${totals.subjects} GATE subjects, with more on the way`}
              lead="Each subject includes the General Aptitude section of its papers. The table shows which years are covered for each one."
            />
          </Reveal>
          <Reveal
            delay={0.1}
            className="overflow-hidden rounded-2xl border border-zinc-200"
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 text-right font-medium">Papers</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Questions
                  </th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                    Years
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {subjects.map((s) => (
                  <tr key={s.code}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{s.name}</span>
                      <span className="ml-2 text-xs text-zinc-400">
                        {s.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                      {s.papers}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                      {fmtInt(s.questions)}
                      <SubjectBar
                        pct={(s.questions / subjects[0].questions) * 100}
                      />
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-zinc-500 sm:table-cell">
                      {s.years}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </Container>
      </section>

      {/* Test types */}
      <section className="border-y border-zinc-100 bg-zinc-50/70 py-20 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Ways to practise"
              title="Four kinds of test, each for a different stage"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {modesFor(totals.papers).map((m, i) => (
              <Reveal key={m.name} delay={i * 0.07}>
                <Link
                  href={m.href}
                  className="group block h-full rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className={type.h3}>{m.name}</h3>
                    <ArrowRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>
                  <p className={`${type.body} mt-2`}>{m.text}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Exam screen */}
      <section className="py-20 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="The exam screen"
              title="Practise on a screen that works like GATE"
              lead="Getting used to the interface is part of preparing. The test screen is modelled on the real exam, with the same kinds of controls."
            />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SCREEN.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <f.icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
                  </span>
                  <h3 className={`${type.h3} mt-5`}>{f.title}</h3>
                  <p className={`${type.body} mt-2`}>{f.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            MCQ, MSQ and numerical-answer questions are all supported. Best on a
            laptop or desktop.
          </p>
        </Container>
      </section>

      {/* Marking + report */}
      <section className="border-t border-zinc-100 py-20 sm:py-24">
        <Container className="grid gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionHeader
              eyebrow="Marking"
              title="Marked the way GATE marks"
              lead="Scores use the official answer key and GATE's own rules, so the number you see is the number you would have got."
            />
            <dl className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200 text-sm">
              {MARKING.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3">
                  <dt className="text-zinc-600">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.1}>
            <SectionHeader
              eyebrow="Your report"
              title="What you see after every test"
            />
            <ul className="mt-8 space-y-4">
              {REPORT.map((r) => (
                <li key={r} className="flex gap-3">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand"
                    strokeWidth={2}
                  />
                  <span className={type.body}>{r}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-zinc-500">
              Your{" "}
              <Link
                href="/gate/dashboard"
                className="font-medium text-brand hover:text-brand-700"
              >
                tracker
              </Link>{" "}
              adds it all up: coverage, accuracy, streak and your weakest topics
              for each paper.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Quality */}
      <section className="bg-ink py-20 text-white sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="text-sm font-medium text-brand-100">
              How questions are checked
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Every question checked against the official paper
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-300">
              A practice test is only useful if the questions and answers are
              right. Before a paper goes live, each question goes through the
              same checks.
            </p>
          </Reveal>
          <ul className="divide-y divide-zinc-800 border-y border-zinc-800">
            {CHECKS.map((c, i) => (
              <Reveal
                as="li"
                key={c}
                delay={i * 0.1}
                className="flex gap-3 py-4 text-zinc-200"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-100"
                  strokeWidth={2}
                />
                {c}
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* Plans */}
      <section className="py-20 sm:py-24">
        <Container className="text-center">
          <SectionHeader
            center
            eyebrow="Plans"
            title="One payment, no subscription"
            lead="Every plan includes all subjects, full past papers, topic practice and ranked tests. Plans don't renew automatically."
          />
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {plans.map(({ name: d, priceInr }, i) => (
              <Reveal key={d} delay={i * 0.08}>
                <Card className="h-full text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand/40">
                  <p className="text-sm text-zinc-500">{d}</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {fmtInr(priceInr)}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/gate/pricing" size="lg">
              Choose a plan
            </ButtonLink>
            <TrialButton
              variant="secondary"
              size="lg"
              label="Try the free demo first"
              paidLabel="Go to your dashboard"
            />
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Full refund within {LEGAL.refundWindowDays} days if you have started no more than{" "}
            {LEGAL.refundMaxAttempts} tests.{" "}
            <Link
              href="/refund-policy"
              className="underline underline-offset-2 hover:text-ink"
            >
              Refund policy
            </Link>
          </p>
        </Container>
      </section>
    </div>
  );
}
