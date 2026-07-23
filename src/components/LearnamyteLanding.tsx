"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import {
  BookOpen, CalendarDays, Users, Sparkles,
  CheckCircle2, Mail, ArrowRight, BarChart3,
  Quote, Clock, GraduationCap, ShieldCheck,
  Phone, Menu, X, Target, Award, Layers,
  Building2, Zap, FileCheck, ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PosterRotator from "@/components/ui/posterrotator";
import { Anchor, Container } from "@/components/LandingPrimitives";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type LeadResponse = { ok: boolean; error?: string; downloadUrl?: string; requireConfirm?: boolean };
type ApiResponse  = { ok: boolean; error?: string };

/* ------------------------------------------------------------------ */
/*  Micro-components                                                   */
/* ------------------------------------------------------------------ */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 inline-block rounded-full border border-[#193BC8]/20 bg-[#193BC8]/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#193BC8]">
    {children}
  </p>
);

const SectionHeading = ({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) => (
  <div className="mx-auto max-w-2xl text-center">
    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{children}</h2>
    {sub && <p className="mt-3 text-base text-gray-500">{sub}</p>}
  </div>
);

const Metric = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="text-3xl font-extrabold text-[#193BC8] sm:text-4xl">{value}</div>
    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function LearnamyteLanding() {
  /* ---- form / modal states (preserved exactly) ---- */
  const [email, setEmail]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState<string | null>(null);
  const [hp, setHp]               = useState("");

  const [brochureOpen, setBrochureOpen]       = useState(false);
  const [selectedCourse, setSelectedCourse]   = useState<null | "FOQIC" | "Python" | "DASQL" | "DVPBI">(null);
  const [selectedTitle, setSelectedTitle]     = useState<string | null>(null);
  const [leadEmail, setLeadEmail]             = useState("");
  const [leadPhone, setLeadPhone]             = useState("");
  const [leadMsg, setLeadMsg]                 = useState<string | null>(null);
  const [leadBusy, setLeadBusy]               = useState(false);
  const [mobileOpen, setMobileOpen]           = useState(false);
  const [verifyToken, setVerifyToken]         = useState("");
  const [verifyNote, setVerifyNote]           = useState<string | null>(null);

  /* ---- handlers (preserved exactly) ---- */
  function goVerifyToken() {
    setVerifyNote(null);
    const t = verifyToken.trim();
    if (!t) { setVerifyNote("Enter a certificate token."); return; }
    window.location.href = `/verify/${encodeURIComponent(t)}`;
  }

  function isApiResponse(x: unknown): x is ApiResponse {
    return typeof x === "object" && x !== null && "ok" in x && typeof (x as { ok: unknown }).ok === "boolean";
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!email) return setMsg("Please enter your email.");
    if (hp) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const text = await res.text();
      let parsed: unknown = null;
      try { parsed = JSON.parse(text); } catch { /* ok */ }
      const payload: ApiResponse | null = isApiResponse(parsed) ? parsed : null;
      if (res.ok && payload?.ok) { setMsg("You're on the list! Check your inbox to confirm."); setEmail(""); }
      else { setMsg(payload?.error || `Request failed (${res.status})`); }
    } catch (err) { setMsg(err instanceof Error ? err.message : "Network error."); }
    finally { setLoading(false); }
  }

  async function submitBrochure(course: "FOQIC" | "Python" | "DASQL" | "DVPBI", e: React.FormEvent) {
    e.preventDefault(); setLeadMsg(null);
    if (!leadEmail || !leadPhone) { setLeadMsg("Please enter your email and mobile number."); return; }
    if (hp) return;
    setLeadBusy(true);
    try {
      const res  = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: leadEmail, phone: leadPhone, course }) });
      const data = (await res.json().catch(() => ({}))) as LeadResponse;
      if (res.status === 202 || data.requireConfirm) { setLeadMsg("Almost there! Confirm your email from your inbox. After you confirm, your brochure will download automatically."); return; }
      if (!res.ok || !data.ok || !data.downloadUrl) { setLeadMsg(data?.error || `Request failed (${res.status})`); return; }
      setLeadEmail(""); setLeadPhone(""); setBrochureOpen(false); setSelectedCourse(null); setSelectedTitle(null);
      window.location.href = data.downloadUrl;
    } catch (err) { setLeadMsg(err instanceof Error ? err.message : "Network error"); }
    finally { setLeadBusy(false); }
  }

  /* ---- data ---- */
  const categories = [
    { title: "Prompt Engineering", copy: "Master prompt engineering to unlock the full potential of AI tools and workflows.", items: ["Prompt basics", "Advanced prompting techniques", "Real-world use cases", "Hands-on labs & projects"], course: null as "FOQIC" | "Python" | "DASQL" | "DVPBI" | null },
    { title: "Data Visualization with Power BI", copy: "Transform raw data into insights with Microsoft Power BI.", items: ["Data modeling & cleaning", "Interactive dashboards", "DAX formulas & calculations", "Business-ready reports"], course: "DVPBI" as const },
    { title: "Data Optimization with Python", copy: "Develop complete optimization tools using Python, pandas, and tkinter.", items: ["Pandas for data handling", "Pivot tables & summaries", "Matplotlib visualization", "Tkinter for UI design", "OOPs in Python", "SMTP automation"], course: "Python" as const },
    { title: "Data Analysis with SQL", copy: "Learn SQL & DBMS from fundamentals to practical applications.", items: ["Basic queries", "Advanced Joins", "Constraints", "Subqueries", "Transactions", "Normalization"], course: "DASQL" as const },
    { title: "Quantum Information & Computing", copy: "From quantum mechanics principles to hands-on circuits and algorithms.", items: ["Qubits & superposition", "Quantum gates & circuits", "Entanglement & teleportation", "Grover's algorithm", "Quantum Fourier Transform", "Intro to Qiskit"], course: "FOQIC" as const },
    { title: "1-on-1 Personal Development", copy: "A personalised learning plan designed around your schedule and career goals.", items: ["Machine Learning", "Generative AI", "Data Science", "Cybersecurity", "Cloud Engineering", "Mathematics"], course: null },
  ];

  const plans = [
    { name: "Single Course", price: "₹4,999", period: "per course", highlights: ["One full workshop", "Live expert-led sessions", "Hands-on projects", "Certificate of completion"], href: "/enroll/single", featured: false },
    { name: "Bundle (2 Courses)", price: "₹7,999", period: "one-time", highlights: ["Choose any 2 courses", "Structured learning path", "Project feedback from instructors", "Save ₹2,000 vs separately"], href: "/enroll/bundle", featured: true },
    { name: "Teams & Corporates", price: "Custom", period: "tailored pricing", highlights: ["Improve operational efficiency 20–40%", "Automate workflows with in-house tools", "Private cohorts for your stack", "Manager dashboard + tracking"], href: "/sales", featured: false },
    { name: "Personal Development", price: "Custom", period: "talk to us", highlights: ["Career-aligned learning plan", "1:1 mentorship with weekly check-ins", "Portfolio-building projects", "Weekly progress nudges"], href: "/sales", featured: false },
  ];

  const faqs = [
    { q: "When are the classes?", a: "Weekend sessions run Sat–Sun for 4–6 weeks." },
    { q: "Do I get a certificate?", a: "Yes. Complete the course and Capstone projects to earn a verifiable certificate." },
    { q: "Is there a refund policy?", a: "Full refund before the 2nd live session. Transfers allowed to later sessions." },
    { q: "Do you provide 24/7 support?", a: "Yes, we provide 24/7 support during the course period." },
  ];

  const NAV_LINKS = [
    { label: "GATE Mocks", href: "/gate" },
    { label: "Workshops", href: "#catalog" },
    { label: "Certificates", href: "#certificates" },
    { label: "Blog", href: "/blog" },
    { label: "Corporate", href: "#about" },
    { label: "Pricing", href: "#pricing" },
    { label: "Contact", href: "#contact" },
  ];

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-[#193BC8] focus:px-3 focus:py-2 focus:text-white">Skip to content</a>

      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg" role="banner">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <Anchor href="/" className="flex items-center gap-2.5 font-bold tracking-tight" aria-label="Learnamyte home">
              <img src="/Official_Logo.png" alt="Learnamyte" className="h-8 w-8 object-contain" />
              <span className="text-lg text-gray-900">Learnamyte</span>
            </Anchor>

            <nav className="hidden items-center gap-6 text-sm font-medium lg:flex" aria-label="Primary">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} className="text-gray-500 transition-colors hover:text-gray-900">{l.label}</a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <Anchor href="/gate/demo">
                <Button size="sm" className="bg-[#193BC8] text-white hover:bg-[#1230a0] gap-1.5 rounded-lg">
                  Start Free Demo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Anchor>
            </div>

            <button type="button" className="inline-flex items-center justify-center rounded-md p-2 lg:hidden" aria-label="Toggle navigation" onClick={() => setMobileOpen((p) => !p)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </Container>

        {mobileOpen && (
          <div className="border-t border-gray-100 bg-white lg:hidden">
            <Container>
              <nav className="flex flex-col gap-1 py-4 text-sm" aria-label="Mobile">
                {NAV_LINKS.map((l) => (
                  <a key={l.label} href={l.href} className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900" onClick={() => setMobileOpen(false)}>{l.label}</a>
                ))}
                <Anchor href="/gate/demo" className="mt-2" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full bg-[#193BC8] text-white hover:bg-[#1230a0] rounded-lg">Start Free Demo</Button>
                </Anchor>
              </nav>
            </Container>
          </div>
        )}
      </header>

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden border-b border-gray-100">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#193BC8]/[0.03] to-transparent" />
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 py-20 sm:py-28 lg:grid-cols-2">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#193BC8]/20 bg-[#193BC8]/5 px-3 py-1 text-xs font-semibold text-[#193BC8]">
                <Zap className="h-3.5 w-3.5" /> Now live — GATE CS/IT Mock Tests
              </div>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.25rem]">
                Practice like the exam.<br />
                <span className="text-[#193BC8]">Prove what you know.</span>
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-500">
                High-fidelity GATE mocks, expert-led workshops, and verifiable certificates — built for outcomes, not pageviews.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Anchor href="/gate/demo">
                  <Button size="lg" className="bg-[#193BC8] text-white hover:bg-[#1230a0] gap-2 rounded-lg px-6 text-sm font-semibold shadow-lg shadow-[#193BC8]/20">
                    Start Free GATE Demo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Anchor>
                <Anchor href="#catalog">
                  <Button size="lg" variant="outline" className="gap-2 rounded-lg px-6 text-sm font-semibold border-gray-200 text-gray-700 hover:bg-gray-50">
                    Explore Workshops
                  </Button>
                </Anchor>
              </div>

              {/* Trust strip */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-gray-400">
                {[
                  [ShieldCheck, "Real exam simulation"],
                  [BarChart3, "Deep analytics"],
                  [Award, "Verified certificates"],
                  [Users, "Expert instructors"],
                ].map(([Icon, text]) => (
                  <span key={text as string} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-[#193BC8]/60" /> {text as string}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — PosterRotator */}
            <div className="relative">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 shadow-sm">
                <PosterRotator />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <main id="main">

        {/* ========== PRODUCT CHOOSER ========== */}
        <section className="border-b border-gray-100 py-20 sm:py-24">
          <Container>
            <SectionLabel>Products</SectionLabel>
            <SectionHeading sub="Mock tests, workshops, certificates, and corporate training — pick your path.">
              Everything you need to learn and prove it
            </SectionHeading>

            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Target, title: "GATE Mock Tests", desc: "65-question CS/IT simulator with TCS iON-style palette, real scoring, and deep analytics.", cta: "Start Free Demo", href: "/gate/demo", accent: true },
                { icon: BookOpen, title: "Workshops", desc: "Weekend cohort-based programs with live instruction, hands-on projects, and capstone reviews.", cta: "Browse courses", href: "#catalog", accent: false },
                { icon: FileCheck, title: "Certificates", desc: "Tamper-proof digital certificates issued on completion. Instantly verifiable by token.", cta: "Verify a certificate", href: "#certificates", accent: false },
                { icon: Building2, title: "Corporate Training", desc: "Custom cohorts for teams. Tailored stack, private dashboards, and measurable ROI.", cta: "Talk to us", href: "#contact", accent: false },
              ].map((p) => (
                <Anchor key={p.title} href={p.href} className="group">
                  <div className={`flex h-full flex-col rounded-xl border p-6 transition-all duration-200 ${p.accent ? "border-[#193BC8]/30 bg-[#193BC8]/[0.02] shadow-sm" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"}`}>
                    <p.icon className={`h-6 w-6 ${p.accent ? "text-[#193BC8]" : "text-gray-400 group-hover:text-[#193BC8]"} transition-colors`} />
                    <h3 className="mt-4 text-base font-bold text-gray-900">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{p.desc}</p>
                    <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${p.accent ? "text-[#193BC8]" : "text-gray-500 group-hover:text-[#193BC8]"} transition-colors`}>
                      {p.cta} <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Anchor>
              ))}
            </div>
          </Container>
        </section>

        {/* ========== GATE MOCKS SPOTLIGHT ========== */}
        <section className="py-20 sm:py-24">
          <Container>
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div>
                <SectionLabel>Flagship Product</SectionLabel>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  GATE CS/IT Mock Tests
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-gray-500">
                  The closest thing to the real exam. 65 questions, 180-minute timer, server-authoritative scoring, and a review flow that actually teaches you.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "TCS iON-style palette with exact color semantics",
                    "MCQ, MSQ, NAT — with GATE-correct negative marking",
                    "Subject-wise, topic-wise, and question-level analytics",
                    "Errata-protected scores with audit trail",
                    "Virtual scientific calculator built-in",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#193BC8]" /> {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Anchor href="/gate/demo">
                    <Button className="bg-[#193BC8] text-white hover:bg-[#1230a0] gap-2 rounded-lg shadow-lg shadow-[#193BC8]/20">
                      Start Free Demo <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Anchor>
                  <Anchor href="/gate/pricing">
                    <Button variant="outline" className="rounded-lg border-gray-200">View plans</Button>
                  </Anchor>
                </div>
              </div>
              {/* Right — mock dashboard illustration */}
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#193BC8]/10 flex items-center justify-center"><Target className="h-5 w-5 text-[#193BC8]" /></div>
                    <div><div className="text-sm font-bold text-gray-900">GATE CS/IT Full Mock</div><div className="text-xs text-gray-400">65 questions · 100 marks · 180 min</div></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white border border-gray-100 p-3 text-center"><div className="text-xl font-extrabold text-[#193BC8]">72.33</div><div className="text-[10px] text-gray-400 mt-0.5">Score / 100</div></div>
                    <div className="rounded-lg bg-white border border-gray-100 p-3 text-center"><div className="text-xl font-extrabold text-emerald-600">94.2</div><div className="text-[10px] text-gray-400 mt-0.5">Percentile</div></div>
                    <div className="rounded-lg bg-white border border-gray-100 p-3 text-center"><div className="text-xl font-extrabold text-gray-900">58/65</div><div className="text-[10px] text-gray-400 mt-0.5">Attempted</div></div>
                  </div>
                  <div className="flex gap-2">
                    {["GA", "DSA", "DBMS", "OS", "CN", "TOC", "Math"].map((s) => (
                      <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* ========== TRUST METRICS ========== */}
        <section className="border-y border-gray-100 bg-gray-50/50 py-14">
          <Container>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              <Metric value="500+" label="Learners trained" />
              <Metric value="2,000+" label="Mock attempts" />
              <Metric value="150+" label="Certificates issued" />
              <Metric value="6" label="Expert workshops" />
            </div>
          </Container>
        </section>

        {/* ========== FEATURES ========== */}
        <section id="features" className="py-20 sm:py-24">
          <Container>
            <SectionLabel>Why Learnamyte</SectionLabel>
            <SectionHeading sub="Everything we build reinforces credibility, quality, and measurable outcomes.">
              Designed for results, not vanity metrics
            </SectionHeading>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Target, title: "Real exam simulation", desc: "Server-authoritative timer, palette, offline lock, and auto-submit — identical to TCS iON." },
                { icon: Layers, title: "Explanation-first review", desc: "Every question reviewed with worked solutions, not just an answer key." },
                { icon: BookOpen, title: "Learn by building", desc: "Weekend workshops with capstone projects, not passive video content." },
                { icon: ShieldCheck, title: "Verified outcomes", desc: "Digital certificates with tamper-proof verification by token." },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#193BC8]/5">
                    <f.icon className="h-5 w-5 text-[#193BC8]" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ========== CERTIFICATES ========== */}
        <section id="certificates" className="border-t border-gray-100 bg-gray-50/30 py-20 sm:py-24">
          <Container>
            <div className="mx-auto max-w-lg text-center">
              <SectionLabel>Certificates</SectionLabel>
              <h2 className="mt-3 text-2xl font-extrabold text-gray-900 sm:text-3xl">Verify any Learnamyte certificate</h2>
              <p className="mt-3 text-sm text-gray-500">Enter the certificate token to check authenticity and view details.</p>

              <div className="mt-6 flex gap-2">
                <Input
                  placeholder="Enter certificate token"
                  className="rounded-lg"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goVerifyToken()}
                />
                <Button onClick={goVerifyToken} className="rounded-lg bg-[#193BC8] text-white hover:bg-[#1230a0] shrink-0">
                  Verify
                </Button>
              </div>
              {verifyNote && <p className="mt-2 text-xs text-red-500">{verifyNote}</p>}
              <p className="mt-3 text-xs text-gray-400">URL format: <span className="font-mono">/verify/&lt;token&gt;</span></p>
            </div>
          </Container>
        </section>

        {/* ========== WORKSHOP CATALOG ========== */}
        <section id="catalog" className="py-20 sm:py-24">
          <Container>
            <SectionLabel>Workshops</SectionLabel>
            <SectionHeading sub="Cohort-based, expert-led sessions. Sat–Sun, 4–6 weeks, with weekday project support.">
              Learn by doing, not watching
            </SectionHeading>

            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <div key={c.title} className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-sm">
                  <h3 className="text-base font-bold text-gray-900">{c.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">{c.copy}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.items.map((i) => (
                      <span key={i} className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">{i}</span>
                    ))}
                  </div>
                  <div className="mt-auto pt-5">
                    {c.course ? (
                      <Button
                        size="sm"
                        className="bg-gray-900 text-white hover:bg-[#193BC8] rounded-lg text-xs"
                        disabled={leadBusy}
                        onClick={() => { setSelectedCourse(c.course!); setSelectedTitle(c.title); setLeadEmail(""); setLeadPhone(""); setLeadMsg(null); setBrochureOpen(true); }}
                      >
                        Download brochure
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-lg text-xs" disabled>Coming soon</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Brochure modal */}
        {brochureOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!leadBusy) { setBrochureOpen(false); setSelectedCourse(null); setSelectedTitle(null); } }} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900">{selectedTitle ?? "Download brochure"}</h3>
              <p className="mt-1 text-sm text-gray-500">Enter your details to get the PDF.</p>

              <form className="mt-5 space-y-3" onSubmit={(e) => { if (!selectedCourse) return; submitBrochure(selectedCourse, e); }}>
                <Input type="email" placeholder="Your email" className="rounded-lg" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} required autoComplete="email" />
                <Input type="tel" placeholder="Mobile number" className="rounded-lg" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} required autoComplete="tel" />
                <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} aria-hidden />

                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={leadBusy} className="bg-[#193BC8] text-white hover:bg-[#1230a0] rounded-lg">
                    {leadBusy ? "Preparing…" : "Get PDF"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-lg" onClick={() => { if (leadBusy) return; setBrochureOpen(false); setSelectedCourse(null); setSelectedTitle(null); }}>
                    Cancel
                  </Button>
                </div>
                {leadMsg && <p className="text-xs text-gray-500 mt-1">{leadMsg}</p>}
              </form>
            </div>
          </div>
        )}

        {/* ========== TESTIMONIALS ========== */}
        <section id="social-proof" className="border-t border-gray-100 bg-gray-50/30 py-20 sm:py-24">
          <Container>
            <SectionLabel>Testimonials</SectionLabel>
            <SectionHeading>Trusted by learners and teams</SectionHeading>

            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                { quote: "The workshop playbooks and hands-on labs helped our team ship a Python tool in a week.", name: "Aravind", role: "Business Analyst, E-commerce" },
                { quote: "Finally a platform that cares about outcomes. Our completion and retention doubled.", name: "Amarnath", role: "Application Engineer, SaaS" },
                { quote: "Crystal clear content. You feel guided by pros who actually do the work.", name: "Kavi", role: "Analyst, Apparel" },
              ].map((t) => (
                <div key={t.name} className="rounded-xl border border-gray-100 bg-white p-6">
                  <Quote className="h-5 w-5 text-[#193BC8]/30" />
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{t.quote}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#193BC8]/10 text-xs font-bold text-[#193BC8]">{t.name[0]}</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ========== PRICING ========== */}
        <section id="pricing" className="py-20 sm:py-24">
          <Container>
            <SectionLabel>Pricing</SectionLabel>
            <SectionHeading sub="Start with a single workshop, bundle for savings, or get a custom team plan.">
              Pick the path that fits you
            </SectionHeading>

            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <div key={p.name} className={`flex flex-col rounded-xl border p-6 transition-shadow ${p.featured ? "border-[#193BC8]/30 shadow-md shadow-[#193BC8]/5" : "border-gray-100 hover:shadow-sm"}`}>
                  {p.featured && <span className="mb-3 inline-block self-start rounded-full bg-[#193BC8]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#193BC8] uppercase">Best value</span>}
                  <h3 className="text-base font-bold text-gray-900">{p.name}</h3>
                  <div className="mt-2"><span className="text-2xl font-extrabold text-gray-900">{p.price}</span> <span className="text-xs text-gray-400">{p.period}</span></div>
                  <ul className="mt-5 flex-1 space-y-2">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm text-gray-500">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#193BC8]" /> {h}
                      </li>
                    ))}
                  </ul>
                  <Anchor href={p.href} className="mt-5">
                    <Button size="sm" variant={p.featured ? "default" : "outline"} className={`w-full rounded-lg ${p.featured ? "bg-[#193BC8] text-white hover:bg-[#1230a0]" : ""}`}>
                      {p.price === "Custom" ? "Talk to us" : "Get started"}
                    </Button>
                  </Anchor>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ========== FAQ ========== */}
        <section id="faq" className="border-t border-gray-100 bg-gray-50/30 py-20 sm:py-24">
          <Container>
            <SectionLabel>FAQ</SectionLabel>
            <SectionHeading>Common questions</SectionHeading>
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
              {faqs.map((f) => (
                <div key={f.q} className="rounded-xl border border-gray-100 bg-white p-5">
                  <h3 className="text-sm font-bold text-gray-900">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.a}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ========== ABOUT ========== */}
        <section id="about" className="py-20 sm:py-24">
          <Container>
            <SectionLabel>Our approach</SectionLabel>
            <SectionHeading sub="Subject-matter expertise, instructional design, and analytics — combined to deliver real outcomes.">
              Learning, engineered
            </SectionHeading>
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 p-6">
                <GraduationCap className="h-6 w-6 text-[#193BC8]" />
                <h3 className="mt-3 text-base font-bold text-gray-900">For learners</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-500">
                  <li>Structured paths with projects and checkpoints</li>
                  <li>Live sessions for accountability and feedback</li>
                  <li>Portfolio-ready artifacts to showcase skills</li>
                </ul>
              </div>
              <div className="rounded-xl border border-gray-100 p-6">
                <Building2 className="h-6 w-6 text-[#193BC8]" />
                <h3 className="mt-3 text-base font-bold text-gray-900">For teams</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-500">
                  <li>Instructor-led live virtual or in-person sessions</li>
                  <li>Training tailored to your stack and goals</li>
                  <li>Integrations for LMS exports and tracking</li>
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* ========== CTA / CONTACT ========== */}
        <section id="contact" className="border-t border-gray-100 bg-gray-50/30 py-20 sm:py-24">
          <Container>
            <div className="rounded-2xl bg-gray-100 px-8 py-12 text-center sm:px-12 sm:py-16">
              <h2 className="text-2xl font-extrabold text-[#193BC8] sm:text-3xl">Ready to start?</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
                Take a free GATE demo, explore workshops, or reach out directly.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Anchor href="/gate/demo">
                  <Button size="lg" className="bg-white text-[#193BC8] hover:bg-gray-100 gap-2 rounded-lg font-semibold shadow-lg">
                    Start Free Demo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Anchor>
                <Anchor href="mailto:team@learnamyte.com?subject=Learnamyte%20Inquiry">
                  <Button size="lg" variant="outline" className="bg-white text-[#193BC8] hover:bg-white/10 gap-2 rounded-lg">
                    <Mail className="h-4 w-4" /> Mail us
                  </Button>
                </Anchor>
                <Anchor href="tel:+916382489221">
                  <Button size="lg" variant="outline" className="bg-white text-[#193BC8] hover:bg-white/10 gap-2 rounded-lg">
                    <Phone className="h-4 w-4" /> Call us
                  </Button>
                </Anchor>
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-gray-100 py-12 text-sm" role="contentinfo">
        <Container>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <img src="/Official_Logo.png" alt="" className="h-6 w-6 object-contain" /> Learnamyte
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-400">
                Expert-led learning that turns knowledge into measurable outcomes.
              </p>
            </div>
            {[
              { heading: "Product", links: [{ label: "GATE Mocks", href: "/gate" }, { label: "Free Demo", href: "/gate/demo" }, { label: "Workshops", href: "/#catalog" }, { label: "Pricing", href: "/#pricing" }, { label: "For Teams", href: "/#about" }] },
              { heading: "Company", links: [{ label: "About", href: "/#about" }, { label: "Blog", href: "/blog" }, { label: "Careers", href: "/careers" }, { label: "Contact", href: "/#contact" }] },
              { heading: "Legal", links: [{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }] },
            ].map((col) => (
              <div key={col.heading}>
                <div className="font-semibold text-gray-900">{col.heading}</div>
                <div className="mt-3 flex flex-col gap-2">
                  {col.links.map((l) => (
                    <Anchor key={l.label} href={l.href} className="text-gray-400 transition-colors hover:text-gray-700">{l.label}</Anchor>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-center">
            <p className="text-gray-400">© {new Date().getFullYear()} Learnamyte (Dxoctagon Pvt Ltd). All rights reserved.</p>
            <p className="text-gray-300">Made with care for curious minds.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}

