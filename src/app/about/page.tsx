// src/app/about/page.tsx — About Lemyte, told as a story: the mission → the founder's story → the problem
// → how we work → the line behind it → what's next. Founder copy lives in src/lib/about.ts.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Linkedin } from "lucide-react";

import { Constellation, Reveal } from "@/components/motion";
import { DotMarkScene } from "@/components/motion/scenes";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { Container, Eyebrow, type } from "@/components/site/ui";
import { FOUNDER, KURAL } from "@/lib/about";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "About — Lemyte",
  description:
    "Lemyte is an Indian education company that builds exam-style assessments. GATE is our first product.",
};

const PROBLEMS = [
  {
    title: "A score on its own doesn't tell you much",
    body: "Knowing you got 48 out of 100 doesn't tell you what to study tomorrow. The useful part is which topics cost you the marks.",
  },
  {
    title: "A mock is only as good as its answer key",
    body: "If the key is wrong, you end up learning the wrong answer with confidence. That's worse than not practising at all.",
  },
  {
    title: "Exam day has its own skills",
    body: "Three hours, negative marks, a virtual calculator, a question palette. These take practice too, and the exam hall is a bad place to learn them.",
  },
];

const PRINCIPLES = [
  [
    "Official papers, official keys",
    "Every question comes from a real GATE paper and is marked against the published answer key, including questions where marks were awarded to everyone.",
  ],
  [
    "Fewer questions over wrong ones",
    "A question goes live only after we've checked it against the original paper. If we aren't sure, it waits.",
  ],
  [
    "Plain pricing",
    "One-time payments and no auto-renewal. If a plan isn't right for you, you get a full refund within 7 days, as long as you've started no more than 2 tests.",
  ],
  [
    "Your data stays yours",
    "We use your attempts to build your reports. We do not sell your personal data.",
  ],
] as const;

export default function AboutPage() {
  return (
    <div className="bg-white text-ink">
      <SiteHeader />
      <main>
        {/* 1 — Mission */}
        <section className="relative overflow-hidden border-b border-zinc-100">
          <Constellation className="opacity-50" density={0.00006} />
          <Container className="relative grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <Reveal>
                <Eyebrow>About Lemyte</Eyebrow>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className={`${type.display} mt-4 max-w-2xl`}>
                  Practice that answers back.
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className={`${type.lead} mt-6 max-w-xl`}>
                  Lemyte is an education company in India. We make exam-style
                  assessments that show students where they stand and what to
                  work on next. GATE is our first exam.
                </p>
              </Reveal>
            </div>
            <Reveal
              delay={0.15}
              className="mx-auto w-full max-w-xs lg:max-w-sm"
            >
              <DotMarkScene />
            </Reveal>
          </Container>
        </section>

        {/* 2 — The founder's story */}
        <section className="py-20 sm:py-28">
          <Container className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-zinc-100 ring-1 ring-zinc-200 lg:max-w-none">
                <Image
                  src={FOUNDER.photo}
                  alt={FOUNDER.name}
                  fill
                  sizes="(min-width:1024px) 400px, 320px"
                  className="object-cover"
                />
              </div>
              <div className="mx-auto mt-5 max-w-xs lg:max-w-none">
                <p className="text-lg font-semibold">{FOUNDER.name}</p>
                <p className="text-sm text-brand">{FOUNDER.role}</p>
                {FOUNDER.linkedin && (
                  <a
                    href={FOUNDER.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-brand"
                  >
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
              </div>
            </Reveal>
            <div>
              <Reveal>
                <Eyebrow>Why Lemyte exists</Eyebrow>
                <h2 className={`${type.h2} mt-3 max-w-xl`}>
                  What if the book could talk back?
                </h2>
              </Reveal>
              <div className="mt-8 space-y-6">
                {FOUNDER.story.map((para, i) => (
                  <Reveal key={i} delay={i * 0.05}>
                    <p className="text-lg leading-relaxed text-zinc-600">
                      {para}
                    </p>
                  </Reveal>
                ))}
              </div>
              <Reveal delay={0.1}>
                <blockquote className="mt-10 border-l-2 border-brand pl-6 text-xl font-medium leading-relaxed text-ink sm:text-2xl">
                  Every student deserves practice
                  that answers back.
                </blockquote>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* 3 — The problem */}
        <section className="border-y border-zinc-100 bg-zinc-50 py-20 sm:py-28">
          <Container>
            <Reveal>
              <Eyebrow>The problem</Eyebrow>
              <h2 className={`${type.h2} mt-3 max-w-2xl`}>
                Most practice ends with a number and nothing else
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 md:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <Reveal
                  key={p.title}
                  delay={i * 0.08}
                  className="bg-white p-6 sm:p-8"
                >
                  <span className="text-sm font-semibold tabular-nums text-brand">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
                    {p.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* 4 — How we work */}
        <section className="bg-ink py-20 text-white sm:py-28">
          <Container>
            <Reveal>
              <p className="text-sm font-medium text-brand-100">How we work</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                A few rules we don&apos;t bend
              </h2>
            </Reveal>
            <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {PRINCIPLES.map(([t, d], i) => (
                <Reveal
                  key={t}
                  delay={i * 0.06}
                  className="border-t border-white/15 pt-6"
                >
                  <dt className="text-lg font-semibold">{t}</dt>
                  <dd className="mt-2 leading-relaxed text-zinc-400">{d}</dd>
                </Reveal>
              ))}
            </dl>
          </Container>
        </section>

        {/* 5 — The line behind it */}
        <section className="py-20 sm:py-28">
          <Container className="text-center">
            <Reveal>
              <p
                lang="ta"
                className="text-2xl font-semibold leading-relaxed text-ink sm:text-3xl"
              >
                {KURAL.tamil.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </p>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
                {KURAL.english}
              </p>
              <p className="mt-3 text-sm text-zinc-400">{KURAL.source}</p>
            </Reveal>
          </Container>
        </section>

        {/* 6 — What's next + where to find us */}
        <section className="border-t border-zinc-100 bg-zinc-50 py-20 sm:py-28">
          <Container className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>What&apos;s next</Eyebrow>
              <h2 className={`${type.h2} mt-3`}>
                GATE first. Other exams when they meet the same bar.
              </h2>
              <p className={`${type.body} mt-4 max-w-lg`}>
                We&apos;ll add an exam only when we can offer it with official
                papers, a checked answer key and the same reports. Until then,
                we&apos;re making GATE as good as it can be.
              </p>
            </Reveal>
            <Reveal
              delay={0.08}
              className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8"
            >
              <p className="font-semibold">
                {LEGAL.brand} is run by {LEGAL.company}
              </p>
              <address className="mt-3 text-[15px] not-italic leading-relaxed text-zinc-600">
                {LEGAL.address}
              </address>
              <dl className="mt-5 grid gap-2 text-sm text-zinc-600 sm:grid-cols-[auto_1fr] sm:gap-x-6">
                <dt className="text-zinc-400">Email</dt>
                <dd>
                  <a
                    className="text-brand hover:text-brand-700"
                    href={`mailto:${LEGAL.email}`}
                  >
                    {LEGAL.email}
                  </a>
                </dd>
                <dt className="text-zinc-400">Phone</dt>
                <dd>{LEGAL.phone}</dd>
                <dt className="text-zinc-400">CIN</dt>
                <dd className="tabular-nums">{LEGAL.cin}</dd>
              </dl>
            </Reveal>
          </Container>
        </section>

        {/* 7 — Invitation */}
        <section className="py-20 sm:py-24">
          <Container>
            <Reveal className="relative overflow-hidden rounded-3xl bg-brand px-6 py-14 text-center text-white sm:px-12">
              <Constellation rgb="255,255,255" density={0.00005} />
              <h2 className="relative text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                See what a Lemyte report looks like.
              </h2>
              <p className="relative mx-auto mt-3 max-w-md text-brand-100">
                The free demo takes a few minutes and needs no card.
              </p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/gate/demo"
                  className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-ink px-6 font-medium text-white transition-colors hover:bg-black"
                >
                  Take the free test <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center rounded-[10px] border border-white/40 px-6 font-medium text-white transition-colors hover:bg-white/10"
                >
                  Contact us
                </Link>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
