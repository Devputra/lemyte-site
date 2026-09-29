// src/app/about/page.tsx — About Lemyte, told as a story: why we exist → the problem → who we are →
// how we work → where we are → what's next. Founder details come from src/lib/about.ts.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Linkedin } from "lucide-react";

import { Constellation, Reveal } from "@/components/motion";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { Container, Eyebrow, type } from "@/components/site/ui";
import { ABOUT } from "@/lib/about";
import { GATE_TOTALS, fmtInt } from "@/lib/gate/catalog";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "About — Lemyte",
  description:
    "Lemyte is a Chennai education company that builds exam-style assessments. GATE is our first product.",
};

const SHOW_SLOTS = process.env.NODE_ENV !== "production";

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

function Slot({ label, className }: { label: string; className?: string }) {
  if (!SHOW_SLOTS) return null;
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-800 ${className ?? ""}`}
    >
      <strong>To fill:</strong> {label}{" "}
      <span className="text-amber-600">
        (src/lib/about.ts — hidden in production until filled)
      </span>
    </div>
  );
}

export default function AboutPage() {
  const { originStory, people, milestones } = ABOUT;
  return (
    <div className="bg-white text-ink">
      <SiteHeader />
      <main>
        {/* 1 — Why we exist */}
        <section className="relative overflow-hidden border-b border-zinc-100">
          <Constellation className="opacity-60" density={0.00006} />
          <Container className="relative grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <Reveal>
                <Eyebrow>About Lemyte</Eyebrow>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className={`${type.display} mt-4 max-w-2xl`}>
                  We build tests that tell you the truth about your preparation.
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className={`${type.lead} mt-6 max-w-xl`}>
                  Lemyte is an education company in Chennai. We make exam-style
                  assessments that show students where they stand and what to
                  work on next. GATE is our first exam.
                </p>
              </Reveal>
            </div>
            <Reveal
              delay={0.15}
              className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl ring-1 ring-zinc-200"
            >
              <Image
                src="/images/illustrations/desk-notes.webp"
                alt=""
                fill
                priority
                sizes="(min-width:1024px) 380px, 90vw"
                className="object-cover"
              />
            </Reveal>
          </Container>
        </section>

        {/* 2 — The problem */}
        <section className="py-20 sm:py-28">
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

        {/* 3 — Who we are (founder story + people); hidden in production until something is filled in */}
        {(originStory || people.length > 0 || SHOW_SLOTS) && (
          <section className="border-y border-zinc-100 bg-zinc-50 py-20 sm:py-28">
            <Container>
              <Reveal>
                <Eyebrow>Who we are</Eyebrow>
                <h2 className={`${type.h2} mt-3`}>The people behind Lemyte</h2>
              </Reveal>
              {originStory ? (
                <Reveal delay={0.05}>
                  <blockquote className="mt-10 max-w-3xl border-l-2 border-brand pl-6 text-xl leading-relaxed text-zinc-700 sm:text-2xl">
                    {originStory}
                  </blockquote>
                </Reveal>
              ) : (
                <Slot
                  className="mt-10 max-w-3xl"
                  label="the origin story — why you started Lemyte, in one short first-person paragraph."
                />
              )}
              {people.length > 0 ? (
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {people.map((p, i) => (
                    <Reveal
                      key={p.name}
                      delay={i * 0.08}
                      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                    >
                      <div className="relative aspect-square bg-zinc-100">
                        <Image
                          src={p.photo}
                          alt={p.name}
                          fill
                          sizes="(min-width:1024px) 360px, 90vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-sm text-brand">{p.role}</p>
                        <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                          {p.bio}
                        </p>
                        {p.linkedin && (
                          <a
                            href={p.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-brand"
                          >
                            <Linkedin className="h-4 w-4" /> LinkedIn
                          </a>
                        )}
                      </div>
                    </Reveal>
                  ))}
                </div>
              ) : (
                <Slot
                  className="mt-6 max-w-3xl"
                  label="founder card(s) — name, role, a real photo, a 2–3 sentence bio, optional LinkedIn."
                />
              )}
            </Container>
          </section>
        )}

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

        {/* 5 — So far */}
        <section className="py-20 sm:py-28">
          <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <Eyebrow>So far</Eyebrow>
              <h2 className={`${type.h2} mt-3`}>Where we are today</h2>
              <p className={`${type.body} mt-4 max-w-sm`}>
                {fmtInt(GATE_TOTALS.questions)} questions from{" "}
                {GATE_TOTALS.papers} official GATE papers across{" "}
                {GATE_TOTALS.subjects} subjects, each checked against the
                original paper.
              </p>
            </Reveal>
            <ol className="relative border-l border-zinc-200 pl-8">
              {milestones.map((m, i) => (
                <Reveal
                  as="li"
                  key={m.what}
                  delay={i * 0.08}
                  className="relative pb-10 last:pb-0"
                >
                  <span className="absolute -left-[37px] top-1 h-3 w-3 rounded-full border-2 border-brand bg-white" />
                  <p className="text-sm font-semibold text-brand">{m.when}</p>
                  <p className="mt-1 text-[17px] leading-relaxed text-zinc-700">
                    {m.what}
                  </p>
                </Reveal>
              ))}
            </ol>
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
