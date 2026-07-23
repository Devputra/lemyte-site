"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  Mail,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

const gateBlogPageContent = {
  seo: {
    title:
      "Learnamyte GATE CS Blog | Mock Test Strategy, PYQ Analysis & Score Improvement",
    description:
      "Explore premium GATE CS preparation content from Learnamyte — mock test strategy, PYQ breakdowns, exam pattern guidance, score improvement frameworks, and practical preparation insights.",
  },

  hero: {
    eyebrow: "LEARNAMYTE INSIGHTS",
    title: "Where Serious GATE Preparation Becomes Structured Progress.",
    subtitle:
      "Not recycled exam fluff. Not generic motivation. Learnamyte brings together mock test strategy, PYQ intelligence, subject-wise improvement frameworks, and practical exam guidance built for aspirants who want measurable growth.",
    primaryCta: {
      label: "Start Free Mock",
      href: "/gate/demo",
    },
    secondaryCta: {
      label: "Explore Articles",
      href: "#featured",
    },
    stats: [
      {
        value: "Exam-Like",
        label: "Mock Experience",
      },
      {
        value: "Actionable",
        label: "Performance Insights",
      },
      {
        value: "Subject-Wise",
        label: "Improvement Paths",
      },
      {
        value: "Focused",
        label: "For Serious Aspirants",
      },
    ],
  },

  introSection: {
    title: "This Is Not Just a Blog.",
    description:
      "This is your preparation intelligence layer. Every article, guide, and breakdown is designed to help you study with more clarity, attempt mocks more strategically, and identify what is actually stopping your score from moving up.",
  },

  featuredSection: {
    title: "Featured Reading",
    subtitle:
      "Start with the pieces that directly improve mock performance and exam decision-making.",
    articles: [
      {
        tag: "Mock Strategy",
        icon: BarChart3,
        title: "How to Read a GATE Mock Test Report Properly",
        description:
          "Most students look at score and move on. Smart students study accuracy, attempt quality, subject weakness, time allocation, and question selection patterns.",
      },
      {
        tag: "Exam Pattern",
        icon: Gauge,
        title: "MCQ vs MSQ vs NAT: The Mistakes That Quietly Destroy Scores",
        description:
          "Understand how each question type behaves, where candidates lose marks unnecessarily, and how to adapt your attempt strategy under pressure.",
      },
      {
        tag: "PYQ Intelligence",
        icon: Brain,
        title: "How to Use Previous Year Questions Without Wasting Time",
        description:
          "PYQs are not just for solving. They are for pattern recognition, topic prioritization, and training your brain to detect repeat traps.",
      },
    ],
  },

  categoriesSection: {
    title: "Browse by What You Need Right Now",
    categories: [
      {
        name: "Getting Started",
        icon: BookOpen,
        description:
          "For aspirants building clarity on exam structure, preparation flow, and first-step strategy.",
      },
      {
        name: "Mock Test Strategy",
        icon: Target,
        description:
          "For students who want to improve scores through better test behavior, not random effort.",
      },
      {
        name: "PYQ Analysis",
        icon: Layers,
        description:
          "For mastering how questions repeat in pattern, logic, and difficulty across years.",
      },
      {
        name: "Subject-Wise Prep",
        icon: PenLine,
        description:
          "For strengthening weak areas like OS, DBMS, CN, TOC, Algorithms, COA, Digital Logic, and Engineering Mathematics.",
      },
      {
        name: "Score Improvement",
        icon: Trophy,
        description:
          "For aspirants stuck in a plateau and needing targeted correction instead of more hours.",
      },
      {
        name: "Exam Readiness",
        icon: Clock,
        description:
          "For final-phase preparation, revision approach, calculator speed, pressure handling, and paper execution.",
      },
    ],
  },

  whyLearnamyteSection: {
    title: "Why Read Learnamyte?",
    points: [
      {
        title: "Built Around Real Performance",
        description:
          "Our content is designed around the actual decisions students make while taking mocks, reviewing mistakes, and preparing under time pressure.",
      },
      {
        title: "Focused on Improvement, Not Noise",
        description:
          "We do not flood you with shallow content. Every piece should either improve understanding, sharpen execution, or move you closer to a better score.",
      },
      {
        title: "Connected to a Real Product",
        description:
          "This content hub works hand in hand with the Learnamyte GATE Mock Test Series, so the advice is practical, product-aware, and implementation-ready.",
      },
    ],
  },

  premiumBanner: {
    label: "SMART PRACTICE STARTS HERE",
    title: "Practice Like the Real Exam. Review Like a Top Performer.",
    description:
      "Experience exam-style mocks, cleaner reporting, structured performance review, and subject-focused progress tracking with Learnamyte GATE Mock Test Series.",
    primaryCta: {
      label: "Try Free Demo",
      href: "/gate/demo",
    },
    secondaryCta: {
      label: "View Mock Series",
      href: "/gate",
    },
  },

  latestTopicsSection: {
    title: "What You’ll Find Here",
    topics: [
      "How to improve from low mock scores",
      "When to start full-length mocks",
      "How to balance PYQs and mock tests",
      "How to reduce negative marking",
      "How to diagnose weak subjects correctly",
      "How to prepare for NAT and MSQ question types",
      "How to revise without breaking momentum",
      "How to approach the last 30 days before exam day",
    ],
  },

  newsletterSection: {
    title: "Stay Sharp. Stay Ahead.",
    description:
      "Get high-value GATE insights, practical mock strategy, and focused preparation content delivered without spam and without filler.",
    placeholder: "Enter your email address",
    buttonLabel: "Get Updates",
  },

  closingSection: {
    title: "Preparation Gets Better When It Becomes Measurable.",
    description:
      "The difference between average preparation and serious preparation is not effort alone. It is structure, feedback, and the discipline to improve from evidence. Learnamyte exists to make that process sharper.",
    cta: {
      label: "Begin Your First Mock",
      href: "/gate/demo",
    },
  },
};

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#193BC8]/20 bg-[#193BC8]/5 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#193BC8]">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-center rounded-full bg-[#193BC8] px-6 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(25,59,200,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(25,59,200,0.35)]"
    >
      {children}
      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-black text-black transition duration-300 hover:-translate-y-0.5 hover:border-[#193BC8] hover:text-[#193BC8] hover:shadow-[0_18px_45px_rgba(0,0,0,0.08)]"
    >
      {children}
    </Link>
  );
}

export default function BlogPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);

    if (!email.trim()) {
      setMsg("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setMsg("You’re on the list. We’ll send only useful GATE insights.");
      setEmail("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/85 backdrop-blur-xl">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#193BC8] text-sm font-black text-white">
                L
              </div>
              <div>
                <div className="text-sm font-black leading-none text-black">Learnamyte</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
                  GATE Insights
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-bold text-black/65 md:flex">
              <a href="#featured" className="transition hover:text-[#193BC8]">
                Featured
              </a>
              <a href="#categories" className="transition hover:text-[#193BC8]">
                Categories
              </a>
              <a href="#topics" className="transition hover:text-[#193BC8]">
                Topics
              </a>
              <Link href="/gate" className="transition hover:text-[#193BC8]">
                GATE Mocks
              </Link>
            </nav>

            <Link
              href="/gate/demo"
              className="rounded-full bg-black px-4 py-2 text-xs font-black text-white transition hover:bg-[#193BC8]"
            >
              Start Free Mock
            </Link>
          </div>
        </Container>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/5 bg-white py-20 sm:py-24 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#193BC8]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-24 h-80 w-80 rounded-full border border-[#193BC8]/15" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full border border-black/10" />

        <Container>
          <div className="relative mx-auto max-w-5xl text-center">
            <SectionEyebrow>{gateBlogPageContent.hero.eyebrow}</SectionEyebrow>

            <h1 className="mx-auto max-w-5xl text-4xl font-black tracking-[-0.05em] text-black sm:text-6xl lg:text-7xl">
              {gateBlogPageContent.hero.title}
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base font-medium leading-8 text-black/65 sm:text-lg">
              {gateBlogPageContent.hero.subtitle}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryButton href={gateBlogPageContent.hero.primaryCta.href}>
                {gateBlogPageContent.hero.primaryCta.label}
              </PrimaryButton>
              <SecondaryButton href={gateBlogPageContent.hero.secondaryCta.href}>
                {gateBlogPageContent.hero.secondaryCta.label}
              </SecondaryButton>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gateBlogPageContent.hero.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-black/10 bg-white p-6 text-left shadow-[0_20px_60px_rgba(0,0,0,0.05)]"
                >
                  <div className="text-2xl font-black tracking-tight text-[#193BC8]">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm font-bold text-black/55">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Intro */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] md:grid-cols-[0.85fr_1.15fr] md:p-12">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#193BC8] text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] text-black sm:text-4xl">
                {gateBlogPageContent.introSection.title}
              </h2>
            </div>

            <div className="flex items-center">
              <p className="text-lg font-medium leading-9 text-black/65">
                {gateBlogPageContent.introSection.description}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured */}
      <section id="featured" className="border-y border-black/5 bg-black/[0.015] py-16 sm:py-20">
        <Container>
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <SectionEyebrow>Start Here</SectionEyebrow>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-black sm:text-5xl">
                {gateBlogPageContent.featuredSection.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-black/60">
                {gateBlogPageContent.featuredSection.subtitle}
              </p>
            </div>

            <Link
              href="/gate/demo"
              className="inline-flex items-center text-sm font-black text-[#193BC8] transition hover:gap-2"
            >
              Try the product behind the advice <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {gateBlogPageContent.featuredSection.articles.map((article, index) => {
              const Icon = article.icon;

              return (
                <article
                  key={article.title}
                  className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#193BC8]/35 hover:shadow-[0_30px_90px_rgba(25,59,200,0.14)]"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[#193BC8] opacity-0 transition duration-300 group-hover:opacity-100" />

                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-[#193BC8]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#193BC8]">
                      {article.tag}
                    </span>
                    <span className="text-xs font-black text-black/20">
                      0{index + 1}
                    </span>
                  </div>

                  <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white transition group-hover:bg-[#193BC8]">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 text-xl font-black tracking-[-0.03em] text-black">
                    {article.title}
                  </h3>
                  <p className="mt-4 text-sm font-medium leading-7 text-black/60">
                    {article.description}
                  </p>

                  <div className="mt-7 inline-flex items-center text-sm font-black text-[#193BC8]">
                    Read framework <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section id="categories" className="py-16 sm:py-20">
        <Container>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <SectionEyebrow>Content Paths</SectionEyebrow>
            <h2 className="text-3xl font-black tracking-[-0.04em] text-black sm:text-5xl">
              {gateBlogPageContent.categoriesSection.title}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {gateBlogPageContent.categoriesSection.categories.map((category) => {
              const Icon = category.icon;

              return (
                <div
                  key={category.name}
                  className="group rounded-[1.75rem] border border-black/10 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#193BC8]/35 hover:shadow-[0_24px_70px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#193BC8]/10 text-[#193BC8] transition group-hover:bg-[#193BC8] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-[-0.02em] text-black">
                        {category.name}
                      </h3>
                      <p className="mt-2 text-sm font-medium leading-7 text-black/58">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Why Learnamyte */}
      <section className="border-y border-black/5 bg-black/[0.015] py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <SectionEyebrow>Why It Matters</SectionEyebrow>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-black sm:text-5xl">
                {gateBlogPageContent.whyLearnamyteSection.title}
              </h2>
              <p className="mt-5 text-base font-medium leading-8 text-black/60">
                The blog should not be a dumping ground. It should push students toward sharper decisions, cleaner practice, and measurable improvement.
              </p>
            </div>

            <div className="space-y-4">
              {gateBlogPageContent.whyLearnamyteSection.points.map((point) => (
                <div
                  key={point.title}
                  className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_16px_45px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex gap-4">
                    <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[#193BC8]" />
                    <div>
                      <h3 className="text-lg font-black text-black">{point.title}</h3>
                      <p className="mt-2 text-sm font-medium leading-7 text-black/60">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Premium CTA */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="relative overflow-hidden rounded-[2.25rem] bg-[#193BC8] p-8 text-white shadow-[0_30px_100px_rgba(25,59,200,0.35)] sm:p-12 lg:p-16">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/20" />
            <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <div className="relative max-w-3xl">
              <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                {gateBlogPageContent.premiumBanner.label}
              </div>

              <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                {gateBlogPageContent.premiumBanner.title}
              </h2>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/78">
                {gateBlogPageContent.premiumBanner.description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={gateBlogPageContent.premiumBanner.primaryCta.href}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-[#193BC8] transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {gateBlogPageContent.premiumBanner.primaryCta.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href={gateBlogPageContent.premiumBanner.secondaryCta.href}
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  {gateBlogPageContent.premiumBanner.secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Latest Topics */}
      <section id="topics" className="border-y border-black/5 bg-black/[0.015] py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <SectionEyebrow>Editorial Focus</SectionEyebrow>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-black sm:text-5xl">
                {gateBlogPageContent.latestTopicsSection.title}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {gateBlogPageContent.latestTopicsSection.topics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4"
                >
                  <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-[#193BC8]" />
                  <p className="text-sm font-bold leading-6 text-black/68">{topic}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Newsletter */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.06)] sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#193BC8] text-white">
              <Mail className="h-7 w-7" />
            </div>

            <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] text-black sm:text-4xl">
              {gateBlogPageContent.newsletterSection.title}
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-8 text-black/60">
              {gateBlogPageContent.newsletterSection.description}
            </p>

            <form
              onSubmit={handleSubscribe}
              className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={gateBlogPageContent.newsletterSection.placeholder}
                className="min-h-12 flex-1 rounded-full border border-black/15 bg-white px-5 text-sm font-semibold text-black outline-none transition placeholder:text-black/35 focus:border-[#193BC8] focus:ring-4 focus:ring-[#193BC8]/10"
              />

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 rounded-full bg-[#193BC8] px-6 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Submitting..." : gateBlogPageContent.newsletterSection.buttonLabel}
              </button>
            </form>

            {msg && <p className="mt-4 text-sm font-bold text-black/55">{msg}</p>}
          </div>
        </Container>
      </section>

      {/* Closing */}
      <section className="border-t border-black/5 bg-white py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-black sm:text-5xl">
              {gateBlogPageContent.closingSection.title}
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-black/60">
              {gateBlogPageContent.closingSection.description}
            </p>

            <div className="mt-8">
              <PrimaryButton href={gateBlogPageContent.closingSection.cta.href}>
                {gateBlogPageContent.closingSection.cta.label}
              </PrimaryButton>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-white py-10">
        <Container>
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-black text-black">Lemyte</div>
              <p className="mt-1 text-sm font-medium text-black/45">
                GATE preparation content, mock strategy, and performance intelligence.
              </p>
            </div>

            <div className="flex gap-5 text-sm font-bold text-black/55">
              <Link href="/gate" className="hover:text-[#193BC8]">
                GATE Mocks
              </Link>
              <Link href="/gate/demo" className="hover:text-[#193BC8]">
                Demo
              </Link>
              <Link href="/" className="hover:text-[#193BC8]">
                Home
              </Link>
            </div>
          </div>
        </Container>
      </footer>
    </main>
  );
}