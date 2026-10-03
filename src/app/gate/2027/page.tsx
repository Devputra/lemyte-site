// src/app/gate/2027/page.tsx — GATE 2027 hub: official dates and pattern (IIT Madras brochure), the syllabus
// changes for each subject we carry, and Lemyte's "Until GATE 2027" plan.
import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";

import { FaqList } from "@/components/site/FaqList";
import { ButtonLink, Container, Eyebrow, type } from "@/components/site/ui";
import { fmtInr } from "@/lib/gate/catalog";
import { getCatalog } from "@/lib/gate/catalog.server";
import { NEGATIVE_MARKING } from "@/lib/gate/exam-facts";
import { daysUntil, fmtDay, GATE_2027, SYLLABUS_2027 } from "@/lib/gate/gate2027";
import { loadActivePlans } from "@/lib/gate/plans.server";
import { abs, breadcrumbLd, type Faq, JsonLd, pageMeta } from "@/lib/seo";

export const revalidate = 3600; // the countdown changes daily

export const metadata = pageMeta({
  title: "GATE 2027: exam dates, syllabus changes and test series",
  description:
    "GATE 2027 by IIT Madras: exam on 6, 7, 13, 14, 20 and 21 February 2027, results on 19 March. What changed in the 2027 syllabus for CS, EC, ME, CE, AE, EE and DA, and Lemyte's GATE 2027 test series from official papers.",
  path: "/gate/2027",
});

const STATUS = {
  unchanged: ["No topic changes", "bg-emerald-50 text-emerald-700"],
  minor: ["Minor changes", "bg-amber-50 text-amber-700"],
  revised: ["Revised", "bg-brand-50 text-brand"],
} as const;

export default async function Gate2027Page() {
  const [{ subjects, totals }, plans] = await Promise.all([getCatalog(), loadActivePlans()]);
  const examPlan = plans.find((p) => p.endsAt);
  const days = daysUntil(GATE_2027.examDays[0]);
  const faqs: Faq[] = [
    {
      q: "When is GATE 2027?",
      a: `On 6, 7, 13, 14, 20 and 21 February 2027, in two sessions a day: forenoon ${GATE_2027.sessions.forenoon} and afternoon ${GATE_2027.sessions.afternoon}. IIT Madras announces which paper is on which day.`,
    },
    { q: "Which institute is organising GATE 2027?", a: `IIT Madras is the organising institute for GATE 2027. The official website is ${GATE_2027.website}.` },
    { q: "When will the GATE 2027 results be announced?", a: "On 19 March 2027, in the GATE Online Application Processing System (GOAPS), according to the official brochure." },
    {
      q: "Has the GATE 2027 syllabus changed?",
      a: "Yes, for most papers. Among the subjects Lemyte covers, Computer Science, Electronics and Communication, Mechanical, Civil and Aerospace were revised; Electrical Engineering and Data Science & AI have no topic changes. Each subject page lists what was added and removed.",
    },
    {
      q: "What is the GATE 2027 exam pattern?",
      a: `A 3-hour computer-based test in English with 65 questions for 100 marks (General Aptitude 15 marks, subject 85 marks), using MCQ, MSQ and numerical answer questions. ${NEGATIVE_MARKING}`,
    },
    { q: "Is there a new paper in GATE 2027?", a: `Yes. GATE 2027 has ${GATE_2027.papers} papers, including the new ${GATE_2027.newPaper} paper. Textile Engineering & Fibre Science becomes part of Engineering Sciences (XE9).` },
    {
      q: "What is Lemyte's GATE 2027 test series?",
      a: `Lemyte turns ${totals.papers} official GATE papers into timed 3-hour tests marked with the official answer key, with topic practice and a report after every test. ${examPlan ? `The ${examPlan.name} plan costs ${fmtInr(examPlan.priceInr)} and lasts until ${fmtDay(examPlan.endsAt!.slice(0, 10))}.` : ""}`.trim(),
    },
  ];
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "GATE 2027: exam dates, syllabus changes and test series",
    url: abs("/gate/2027"),
    dateModified: GATE_2027.checked,
    author: { "@type": "Organization", name: "Lemyte", url: abs("/") },
    publisher: { "@id": abs("/#organization") },
    citation: GATE_2027.brochure,
    about: { "@type": "Thing", name: "GATE 2027" },
  };

  return (
    <div className="bg-white text-ink">
      <JsonLd data={[breadcrumbLd([{ name: "GATE", path: "/gate" }, { name: "GATE 2027", path: "/gate/2027" }]), articleLd]} />

      <section className="border-b border-zinc-100 bg-zinc-50/60">
        <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <Eyebrow>GATE 2027 · Lemyte</Eyebrow>
            <h1 className={`${type.display} mt-4 !text-[2.25rem] sm:!text-5xl`}>GATE 2027: dates, syllabus changes and how to prepare</h1>
            <p className={`${type.lead} mt-5 max-w-2xl`}>
              GATE 2027 is organised by IIT Madras from 6 to 21 February 2027, and the syllabus of most papers has been revised.
              Here is what the official brochure says, what changed in each subject, and how to prepare with PYQs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/gate/pricing" size="lg">
                {examPlan ? `${examPlan.name}: ${fmtInr(examPlan.priceInr)}` : "See plans"}
              </ButtonLink>
              <ButtonLink href="/gate/demo" variant="secondary" size="lg">Take the free demo</ButtonLink>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <CalendarDays className="h-5 w-5 text-brand" />
            <p className="mt-3 text-5xl font-semibold tabular-nums tracking-tight">{days}</p>
            <p className="mt-1 text-sm text-zinc-500">days to the first GATE 2027 exam day ({fmtDay(GATE_2027.examDays[0])})</p>
          </div>
        </Container>
      </section>

      <Container className="grid grid-cols-[minmax(0,1fr)] gap-16 py-14 sm:py-20">
        <section aria-labelledby="dates">
          <Eyebrow>Official schedule</Eyebrow>
          <h2 id="dates" className={`${type.h2} mt-3`}>GATE 2027 important dates</h2>
          <div className="mt-6 max-w-2xl overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-zinc-100">
                {GATE_2027.timeline.map(([what, when]) => (
                  <tr key={what}>
                    <td className="px-4 py-3 text-zinc-700">{what}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">{fmtDay(when)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-3 text-zinc-700">Sessions</td>
                  <td className="px-4 py-3 text-right font-medium text-ink">
                    {GATE_2027.sessions.forenoon} and {GATE_2027.sessions.afternoon}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Source:{" "}
            <a href={GATE_2027.brochure} className="text-brand underline underline-offset-2" rel="noopener" target="_blank">
              GATE 2027 information brochure
            </a>{" "}
            ({GATE_2027.organiser}, revised {GATE_2027.brochureRevised}). Dates can change; check{" "}
            <a href={GATE_2027.website} className="text-brand underline underline-offset-2" rel="noopener" target="_blank">
              gate2027.iitm.ac.in
            </a>{" "}
            before you plan around them.
          </p>
        </section>

        <section aria-labelledby="pattern">
          <Eyebrow>Exam pattern</Eyebrow>
          <h2 id="pattern" className={`${type.h2} mt-3`}>GATE 2027 exam pattern</h2>
          <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[
              ["3 hours", "Computer-based, in English"],
              ["65 questions", "100 marks"],
              ["15 + 85", "General Aptitude + subject marks"],
              ["MCQ · MSQ · NAT", "Question types"],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="text-xs text-zinc-500">{k}</dt>
                <dd className="mt-1 text-[15px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className={`${type.body} mt-6 max-w-2xl`}>{NEGATIVE_MARKING}</p>
        </section>

        <section aria-labelledby="syllabus">
          <Eyebrow>Syllabus changes</Eyebrow>
          <h2 id="syllabus" className={`${type.h2} mt-3`}>What changed in the GATE 2027 syllabus</h2>
          <p className={`${type.body} mt-3 max-w-2xl`}>
            We compared each 2027 syllabus with the official 2026 one, line by line. Open a subject for the full list of added and
            removed topics and its topic-wise weightage.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {subjects
              .filter((s) => SYLLABUS_2027[s.code])
              .map((s) => {
                const c = SYLLABUS_2027[s.code];
                const [label, tone] = STATUS[c.status];
                return (
                  <Link
                    key={s.code}
                    href={`/gate/${s.code.toLowerCase()}`}
                    className="group rounded-2xl border border-zinc-200 p-5 transition-colors hover:border-brand"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-ink">
                        {s.name} ({s.code})
                      </h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">{c.summary}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand">
                      GATE 2027 {s.code} syllabus and weightage <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
          </div>
        </section>

        <section aria-labelledby="prepare" className="rounded-2xl bg-ink p-6 text-white sm:p-10">
          <h2 id="prepare" className="text-2xl font-semibold tracking-tight sm:text-3xl">Prepare for GATE 2027 with Lemyte</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-300">
            Take {totals.papers} official GATE papers ({totals.questions.toLocaleString("en-IN")} questions) as timed 3-hour tests on
            an exam-style screen, marked with the official answer key. Your report shows which topics cost you marks, and topic
            practice lets you work on exactly those. Each subject page tells you which past topics are no longer on the 2027
            syllabus.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/gate/pricing" size="lg">
              {examPlan ? `Get ${examPlan.name} for ${fmtInr(examPlan.priceInr)}` : "See plans"}
            </ButtonLink>
            <ButtonLink href="/gate/papers" variant="secondary" size="lg">Browse PYQs</ButtonLink>
          </div>
        </section>

        <section aria-labelledby="faq">
          <h2 id="faq" className={type.h2}>GATE 2027: common questions</h2>
          <FaqList faqs={faqs} className="mt-6 max-w-3xl" />
        </section>
      </Container>
    </div>
  );
}
