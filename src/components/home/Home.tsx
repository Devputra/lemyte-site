// src/components/home/Home.tsx — the Lemyte home page (client: motion + scrollytelling).
// Structure follows a conversion landing page: hero → proof → what/why → how it works → benefits →
// product → use case → FAQ → CTA. Every number comes from the database (getCatalog).
"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  LineChart,
  ListChecks,
  Medal,
  Timer,
} from "lucide-react";

import { TrialButton } from "@/components/site/AccessCta";
import { ButtonLink, Container, Eyebrow, SectionHeader, type } from "@/components/site/ui";
import {
  Constellation,
  CountUp,
  DrawPath,
  Magnetic,
  Marquee,
  Reveal,
  ScrollProgress,
  SplitWords,
  useSectionProgress,
} from "@/components/motion";
import { AnswerSheetScene, PlanScene, RecallScene } from "@/components/motion/scenes";
import { type Catalog, fmtInr, fmtInt } from "@/lib/gate/catalog";
import { LEGAL } from "@/lib/legal";

const WHY = [
  { title: "Recalling beats rereading", text: "Answering from memory makes it stick far better than reading your notes again (the testing effect)." },
  { title: "You can only fix what you can see", text: "A score says how you did. A topic-by-topic breakdown says what to do next." },
  { title: "Exam technique is a skill too", text: "Pacing three hours, negative marks and the on-screen calculator take practice. Better in a mock than in the exam hall." },
];

const STEPS = [
  { icon: ClipboardList, title: "Pick a test", text: "A full past paper, or ten questions from one topic." },
  { icon: Timer, title: "Take it like the real exam", text: "Timer, question palette, mark for review and the on-screen calculator." },
  { icon: ListChecks, title: "Get marked the GATE way", text: "Official answer key and negative marking, including marks-to-all questions." },
  { icon: LineChart, title: "Review, then practise", text: "Worked solutions for every question. Your weakest topics move to the top of your practice list." },
];

const GETS = [
  { icon: BarChart3, title: "Know what to revise", text: "Accuracy by topic shows which topics cost you marks." },
  { icon: BookOpenCheck, title: "Learn from every mistake", text: "A step-by-step solution for every question." },
  { icon: Medal, title: "See where you stand", text: "Ranked tests compare you with everyone who took the same paper." },
  { icon: LineChart, title: "Watch yourself improve", text: "Coverage, accuracy and a daily streak for each paper." },
];

const PLAN = [
  { when: "Week 1", what: "One full past paper under exam conditions, as your baseline." },
  { when: "Weeks 2–6", what: "Ten questions a day from your three weakest topics. One full paper each weekend." },
  { when: "Weeks 7–8", what: "Two or three full papers a week, then a ranked test." },
];

const faqFor = (c: Catalog) => [
  { q: "Where do the questions come from?", a: "Official GATE papers, with answers from the official keys and figures from the original papers." },
  { q: "Can I try it before paying?", a: "Yes. The demo test is free and needs no card." },
  { q: "Does my plan renew automatically?", a: `No. Plans are one-time payments: ${c.plans.map((p) => (p.endsAt ? p.name[0].toLowerCase() + p.name.slice(1) : p.name.toLowerCase())).join(", ").replace(/, ([^,]+)$/, " or $1")}. Full refund within ${LEGAL.refundWindowDays} days if you have started no more than ${LEGAL.refundMaxAttempts} tests.` },
  { q: "Which GATE papers are covered?", a: `${c.subjects.map((s) => s.name).join(", ")}.` },
];

const CatalogContext = createContext<Catalog | null>(null);
const useCatalog = () => useContext(CatalogContext)!;

export default function Home({ catalog }: { catalog: Catalog }) {
  return (
    <CatalogContext.Provider value={catalog}>
      <ScrollProgress />
      <Hero />
      <ProofStrip />
      <WhySection />
      <HowItWorks />
      <Benefits />
      <GateProduct />
      <UseCase />
      <Faq />
      <AboutTeaser />
      <FinalCta />
    </CatalogContext.Provider>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  const { totals } = useCatalog();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  return (
    <section ref={ref} className="relative overflow-hidden border-b border-zinc-100">
      <Constellation className="opacity-70 [mask-image:radial-gradient(ellipse_at_30%_40%,#000_30%,transparent_75%)]" />
      <Container className="relative grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Reveal>
            <Eyebrow>Assessments for competitive exams</Eyebrow>
          </Reveal>
          <h1 className={`${type.display} mt-4`}>
            <SplitWords text="Practice tests that show you what to study next." />
          </h1>
          <Reveal delay={0.35}>
            <p className={`${type.lead} mt-6 max-w-xl`}>
              {fmtInt(totals.questions)} questions from {totals.papers} official GATE papers, marked the way GATE marks
              them. Every test ends with a list of what to work on next.
            </p>
          </Reveal>
          <Reveal delay={0.5}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Magnetic>
                <TrialButton size="lg" arrow paidLabel="Start a PYQ paper" paidHref="/gate/practice" />
              </Magnetic>
              <ButtonLink href="#how-it-works" variant="secondary" size="lg">
                How it works
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <div className="relative mx-auto w-full max-w-md sm:pb-[200px] lg:max-w-none">
          <motion.div style={{ y: artY }} className="relative ml-auto w-[90%]">
            <AnswerSheetScene />
          </motion.div>
          <motion.div style={{ y: cardY }} className="relative z-10 -mt-10 w-[88%] sm:absolute sm:bottom-0 sm:left-0 sm:mt-0 sm:w-[58%] lg:w-[52%]">
            <ReportPreview />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

function ReportPreview() {
  const topics: [string, number][] = [
    ["Computer Networks", 38],
    ["Databases", 52],
    ["Algorithms", 74],
  ];
  return (
    <Reveal delay={0.6} y={30}>
      <div className="rounded-2xl border border-zinc-200 bg-white/95 p-5 shadow-[0_30px_70px_-30px_rgba(25,59,200,0.45)] backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">GATE CS · Practice test · Your result</p>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">Example</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-y border-zinc-100 py-4">
          {[
            ["58.33", "Score"],
            ["71%", "Accuracy"],
            ["−2.67", "Negative"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-lg font-semibold tabular-nums text-ink">{v}</p>
              <p className="text-[11px] text-zinc-500">{l}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-2.5">
          {topics.map(([name, pct], i) => (
            <li key={name}>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-700">{name}</span>
                <span className="tabular-nums text-zinc-500">{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
                <motion.div
                  data-motion
                  className={`h-full origin-left rounded-full ${pct < 50 ? "bg-rose-500" : pct < 75 ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${pct}%` }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.8 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs text-ink">
          Next: <span className="font-medium">10 questions on Computer Networks</span>
          <ArrowRight className="h-3.5 w-3.5 text-brand" />
        </p>
      </div>
    </Reveal>
  );
}

/* ---------------- Proof: real numbers + marquee of papers ---------------- */
function ProofStrip() {
  const { totals, papers, subjects } = useCatalog();
  // The three most recent papers of each subject, newest first.
  const recent = subjects.flatMap((s) => papers.filter((p) => p.code === s.code).slice(0, 3));
  return (
    <section className="border-b border-zinc-100 bg-zinc-50/70 py-12">
      <Container>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {(
            [
              [totals.questions, "", "past-paper questions"],
              [totals.papers, "", "official papers"],
              [totals.subjects, "", "GATE subjects"],
              [100, "%", "marked with the official key"],
            ] as const
          ).map(([v, suffix, l]) => (
            <div key={l}>
              <dt className="text-3xl font-semibold tracking-tight text-ink">
                <CountUp to={v} />
                {suffix}
              </dt>
              <dd className="mt-1 text-sm text-zinc-500">{l}</dd>
            </div>
          ))}
        </dl>
      </Container>
      <div className="mt-10">
        <Marquee speed={55}>
          {recent.map((p, i) => (
            <span key={`${p.code}${p.year}${i}`} className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
              GATE {p.year} · <span className="font-medium text-ink">{p.code}</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

/* ---------------- Why it matters (parallax art) ---------------- */
function WhySection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0px", "0px"] : ["40px", "-40px"]);
  return (
    <section ref={ref} id="why" className="relative overflow-hidden bg-ink py-20 text-white sm:py-28">
      <Container className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-2xl">
          <Reveal>
            <p className="text-sm font-medium text-brand-100">Why it matters</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Testing yourself is how learning sticks</h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-300">Notes and lectures feel productive. Tests show what will hold up on exam day.</p>
          </Reveal>
          <div className="mt-10 divide-y divide-zinc-800 border-y border-zinc-800">
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={i * 0.08}>
                <div className="py-6">
                  <h3 className="text-lg font-semibold">{w.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{w.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <motion.div style={{ y }}>
          <RecallScene />
        </motion.div>
      </Container>
    </section>
  );
}

/* ---------------- How it works: scrollytelling with a self-drawing line ---------------- */
function HowItWorks() {
  const { ref, progress } = useSectionProgress<HTMLDivElement>();
  const [active, setActive] = useState(0);
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="How Lemyte's assessment works"
            title="From one test to a clear next step"
          />
        </Reveal>
        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          <div ref={ref} className="relative">
            <svg className="absolute left-[19px] top-2 h-[calc(100%-16px)] w-1 overflow-visible" preserveAspectRatio="none" viewBox="0 0 2 100" aria-hidden>
              <path d="M1 0 V100" className="stroke-zinc-200" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
              <DrawPath d="M1 0 V100" progress={progress} className="stroke-brand" strokeWidth={2} />
            </svg>
            <ol className="space-y-14">
              {STEPS.map((s, i) => (
                <Step key={s.title} index={i} step={s} onActive={setActive} active={active === i} />
              ))}
            </ol>
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <StepVisual step={active} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Step({ index, step, onActive, active }: { index: number; step: (typeof STEPS)[number]; onActive: (i: number) => void; active: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  return (
    <li ref={ref} className="relative pl-14">
      <span
        className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium tabular-nums transition-colors duration-500 ${
          active ? "border-brand bg-brand text-white" : "border-zinc-200 bg-white text-zinc-400"
        }`}
      >
        0{index + 1}
      </span>
      <div className={`transition-opacity duration-500 ${active ? "opacity-100" : "opacity-60"}`}>
        <step.icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-ink">{step.title}</h3>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-zinc-600">{step.text}</p>
      </div>
    </li>
  );
}

function StepVisual({ step }: { step: number }) {
  return (
    <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 flex items-center justify-center p-8"
          initial={false}
          animate={{ opacity: step === i ? 1 : 0, scale: step === i ? 1 : 0.97 }}
          transition={{ duration: 0.45 }}
          aria-hidden={step !== i}
        >
          {i === 0 && <VisPick />}
          {i === 1 && <VisExam />}
          {i === 2 && <VisMarking />}
          {i === 3 && <VisReport />}
        </motion.div>
      ))}
    </div>
  );
}

function VisPick() {
  return (
    <div className="w-full max-w-sm space-y-2">
      {["GATE 2026 · Mechanical", "GATE 2025 · Mechanical", "Topic · Heat Transfer (10 Q)"].map((t, i) => (
        <div key={t} className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm ${i === 0 ? "border-brand ring-2 ring-brand/15" : "border-zinc-200"}`}>
          <span className="font-medium text-ink">{t}</span>
          <span className={`rounded-md px-2 py-1 text-xs ${i === 0 ? "bg-brand text-white" : "bg-zinc-100 text-zinc-500"}`}>Start</span>
        </div>
      ))}
    </div>
  );
}

function VisExam() {
  const states = ["bg-emerald-500", "bg-emerald-500", "bg-rose-500", "bg-white", "bg-purple-600", "bg-emerald-500", "bg-white", "bg-white", "bg-white", "bg-white"];
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Question 7 · MCQ · 2 marks</span>
        <span className="rounded bg-ink px-2 py-1 font-mono text-emerald-300">02:41:18</span>
      </div>
      <div className="mt-3 h-2 w-3/4 rounded bg-zinc-200" />
      <div className="mt-2 h-2 w-1/2 rounded bg-zinc-200" />
      <div className="mt-4 space-y-2">
        {[0, 1, 2, 3].map((o) => (
          <div key={o} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${o === 1 ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"}`}>
            <span className={`h-3 w-3 rounded-full border ${o === 1 ? "border-emerald-500 bg-emerald-500" : "border-zinc-300"}`} />
            <span className="h-1.5 w-24 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1">
        {states.map((c, i) => (
          <span key={i} className={`h-4 rounded-sm border border-zinc-200 ${c}`} />
        ))}
      </div>
    </div>
  );
}

function VisMarking() {
  const rows = [
    ["Correct", "+2", "text-emerald-600"],
    ["Wrong MCQ (2-mark)", "−⅔", "text-rose-600"],
    ["Wrong MSQ / NAT", "0", "text-zinc-500"],
    ["Awarded to all", "+2", "text-emerald-600"],
  ];
  return (
    <div className="w-full max-w-sm divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
      {rows.map(([k, v, c], i) => (
        <motion.div key={k} data-motion className="flex justify-between px-4 py-3 text-sm" initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
          <span className="text-zinc-600">{k}</span>
          <span className={`font-semibold tabular-nums ${c}`}>{v}</span>
        </motion.div>
      ))}
    </div>
  );
}

function VisReport() {
  return (
    <div className="w-full max-w-sm">
      <ReportPreviewMini />
    </div>
  );
}

function ReportPreviewMini() {
  const bars: [string, number][] = [
    ["Thermodynamics", 44],
    ["Fluid Mechanics", 61],
    ["Machine Design", 83],
  ];
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">Accuracy by topic</p>
      <div className="mt-3 space-y-3">
        {bars.map(([n, p]) => (
          <div key={n}>
            <div className="flex justify-between text-xs">
              <span>{n}</span>
              <span className="tabular-nums text-zinc-500">{p}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
              <div className={`h-full rounded-full ${p < 50 ? "bg-rose-500" : p < 75 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-xs">
        Next: <span className="font-medium">10 questions on Thermodynamics</span>
      </p>
    </div>
  );
}

/* ---------------- Benefits ---------------- */
function Benefits() {
  return (
    <section id="what-you-get" className="border-t border-zinc-100 bg-zinc-50/70 py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeader eyebrow="What you get" title="After every test" />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GETS.map((g, i) => (
            <Reveal key={g.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_18px_40px_-24px_rgba(25,59,200,0.45)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 transition-colors group-hover:bg-brand">
                  <g.icon className="h-5 w-5 text-brand transition-colors group-hover:text-white" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 font-semibold text-ink">{g.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-600">{g.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------- GATE product: interactive infographic ---------------- */
function GateProduct() {
  const { subjects, totals, fromInr } = useCatalog();
  const max = Math.max(...subjects.map((s) => s.questions));
  const [hover, setHover] = useState<string | null>(null);
  return (
    <section id="gate" className="relative overflow-hidden bg-ink py-20 text-white sm:py-28">
      <Container className="relative grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <p className="text-sm font-medium text-brand-100">Our first product</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">GATE assessment</h2>
          <p className="mt-4 text-lg leading-relaxed text-zinc-300">
            Real past papers on an exam-like screen, marked the official way.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] text-zinc-300">
            {["Full PYQ papers: 65 questions, 3 hours, official marking", "Topic practice: 5 to 30 questions from one topic", "Ranked tests with one counted attempt", "A free demo test, no card needed"].map((m) => (
              <li key={m} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-100" strokeWidth={1.75} />
                {m}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href="/gate" size="lg">
              Explore GATE assessment <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <p className="text-sm text-zinc-400">Plans from {fmtInr(fromInr)} · paid once</p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 sm:p-8">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-zinc-300">Questions by subject</p>
              <p className="text-xs text-zinc-500">{hover ? subjects.find((s) => s.code === hover)?.years : `${totals.papers} papers`}</p>
            </div>
            <ul className="mt-6 space-y-4">
              {subjects.map((s, i) => (
                <li key={s.code} onMouseEnter={() => setHover(s.code)} onMouseLeave={() => setHover(null)} className="cursor-default">
                  <div className="flex justify-between text-sm">
                    <span className={hover && hover !== s.code ? "text-zinc-500" : "text-zinc-100"}>{s.name}</span>
                    <span className="tabular-nums text-zinc-400">
                      {fmtInt(s.questions)} <span className="text-zinc-600">· {s.papers} papers</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-zinc-800">
                    <motion.div
                      data-motion
                      className={`h-full origin-left rounded-full ${hover === s.code ? "bg-white" : "bg-brand"}`}
                      style={{ width: `${(s.questions / max) * 100}%` }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------------- Use case: an example 8-week plan ---------------- */
function UseCase() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <Reveal className="order-last lg:order-none">
          <PlanScene />
        </Reveal>
        <div>
          <Reveal>
            <SectionHeader
              eyebrow="Putting it together"
              title="An example plan for the last eight weeks"
              lead="Test, find the gaps, fix them, test again. Adjust it to your own timetable."
            />
          </Reveal>
          <ol className="mt-10 space-y-4">
            {PLAN.map((p, i) => (
              <Reveal as="li" key={p.when} delay={i * 0.1}>
                <div className="flex gap-5 rounded-2xl border border-zinc-200 p-5">
                  <span className="w-24 shrink-0 text-sm font-semibold text-brand">{p.when}</span>
                  <span className="text-[15px] leading-relaxed text-zinc-600">{p.what}</span>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function Faq() {
  const catalog = useCatalog();
  return (
    <section id="faq" className="border-t border-zinc-100 py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <SectionHeader eyebrow="Questions" title="Good to know" />
        </Reveal>
        <div className="divide-y divide-zinc-200 border-y border-zinc-200">
          {faqFor(catalog).map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold text-ink">
                {f.q}
                <span className="text-xl leading-none text-zinc-400 transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className={`${type.body} mt-3 max-w-2xl`}>{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------- About teaser ---------------- */
function AboutTeaser() {
  return (
    <section id="about" className="border-t border-zinc-100 bg-zinc-50/70 py-20">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <SectionHeader eyebrow="About Lemyte" title="Knowledge is the one asset no one can take from you" />
        </Reveal>
        <Reveal delay={0.1}>
          <div className={`${type.lead} space-y-4`}>
            <p>
              An Indian education company building exam-style assessments, starting with GATE. Every question is checked
              against the official paper and key; we would rather have fewer questions than wrong ones.
            </p>
            <Link href="/about" className="inline-flex items-center gap-1 font-medium text-brand hover:text-brand-700">
              Our story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand px-6 py-14 text-center text-white sm:px-12">
            <Constellation className="opacity-50" density={0.00012} rgb="255,255,255" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">See where you stand today.</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">Take the free demo and look at your report.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Magnetic>
                  <TrialButton variant="dark" size="lg" paidLabel="Start a PYQ paper" paidHref="/gate/practice" />
                </Magnetic>
                <Link href="/gate/pricing" className="inline-flex h-12 items-center rounded-[10px] border border-white/40 px-6 font-medium text-white transition-colors hover:bg-white/10">
                  See plans
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
