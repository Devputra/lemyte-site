// src/app/gate/[subject]/page.tsx — one GATE subject (/gate/ee, /gate/cs, …): topic-wise marks across every
// official paper we carry, the GATE 2027 syllabus changes, and links to each paper.
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FaqList } from "@/components/site/FaqList";
import { ButtonLink, Container, Eyebrow, type } from "@/components/site/ui";
import { GATE_2027, SYLLABUS_2027 } from "@/lib/gate/gate2027";
import { getPapers, getSubject, type SubjectWeightage } from "@/lib/gate/papers.server";
import { abs, breadcrumbLd, type Faq, JsonLd, pageMeta } from "@/lib/seo";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return [...new Set((await getPapers()).map((p) => p.code.toLowerCase()))].map((subject) => ({ subject }));
}

type Props = { params: Promise<{ subject: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getSubject((await params).subject);
  if (!s) return {};
  const y = `${s.years[0]}–${s.years.at(-1)}`;
  return pageMeta({
    title: `GATE ${s.code} previous year papers, topic-wise weightage and 2027 syllabus`,
    description: `Topic-wise marks in every GATE ${s.subject} paper from ${y} (${s.papers.length} official papers), what changed in the GATE 2027 ${s.code} syllabus, and each paper with its answer key.`,
    path: `/gate/${s.code.toLowerCase()}`,
  });
}

function faqsFor(s: SubjectWeightage): Faq[] {
  const top = s.topics.slice(0, 3);
  const change = SYLLABUS_2027[s.code];
  const y = `${s.years[0]}–${s.years.at(-1)}`;
  return [
    {
      q: `Which topics carry the most marks in GATE ${s.code}?`,
      a: `Across the official GATE ${s.subject} papers from ${y}, the topics with the most marks per paper on average were ${top.map((t) => `${t.name} (${t.average} marks)`).join(", ")}. General Aptitude adds a fixed 15 marks.`,
    },
    {
      q: `Has the GATE 2027 ${s.code} syllabus changed?`,
      a: change ? `${change.status === "unchanged" ? "No. " : "Yes. "}${change.summary}` : "Check the official GATE 2027 information brochure from IIT Madras.",
    },
    {
      q: `Are GATE ${s.code} previous year papers still useful for 2027?`,
      a:
        change?.status === "revised"
          ? `Yes, for most topics: the core of the syllabus is the same. Questions on topics removed in 2027 (${change.removed.slice(0, 2).join("; ")}) are no longer examined, so give them less time.`
          : `Yes. The GATE 2027 ${s.code} syllabus has no topic changes, so every past question is still on the syllabus.`,
    },
    {
      q: `When is the GATE 2027 exam?`,
      a: `GATE 2027 is organised by ${GATE_2027.organiser} on 6, 7, 13, 14, 20 and 21 February 2027, in a forenoon (${GATE_2027.sessions.forenoon}) and an afternoon (${GATE_2027.sessions.afternoon}) session. Results are due on 19 March 2027. The date of each paper is announced by IIT Madras.`,
    },
    {
      q: `How many GATE ${s.code} papers can I practise on Lemyte?`,
      a: `${s.papers.length} official papers from ${y}. Each one runs as a full 3-hour test on an exam-style screen and is marked with the official answer key.`,
    },
  ];
}

export default async function SubjectPage({ params }: Props) {
  const s = await getSubject((await params).subject);
  if (!s) notFound();
  const change = SYLLABUS_2027[s.code];
  const path = `/gate/${s.code.toLowerCase()}`;
  const swing = [...s.topics]
    .map((t) => {
      const v = s.years.map((y) => t.byYear[y] ?? 0);
      return { name: t.name, min: Math.min(...v), max: Math.max(...v) };
    })
    .sort((a, b) => b.max - b.min - (a.max - a.min))[0];
  const crumbs = [
    { name: "GATE", path: "/gate" },
    { name: `GATE ${s.code}`, path },
  ];
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `GATE ${s.code} topic-wise marks, ${s.years[0]}–${s.years.at(-1)}`,
    description: `Marks per topic in each official GATE ${s.subject} paper from ${s.years[0]} to ${s.years.at(-1)}, computed by Lemyte from ${s.papers.length} official papers and their answer keys. Sets of the same year are averaged.`,
    url: abs(path),
    creator: { "@type": "Organization", name: "Lemyte", url: abs("/") },
    temporalCoverage: `${s.years[0]}/${s.years.at(-1)}`,
    variableMeasured: "Marks per topic per paper",
    isAccessibleForFree: true,
    license: abs("/terms"),
  };

  return (
    <div className="bg-white text-ink">
      <JsonLd data={[breadcrumbLd(crumbs), datasetLd]} />
      <section className="border-b border-zinc-100 bg-zinc-50/60">
        <Container className="py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
            <Link href="/gate" className="hover:text-ink">GATE</Link>
            <span className="mx-2 text-zinc-300">/</span>
            <span className="text-zinc-700">GATE {s.code}</span>
          </nav>
          <h1 className={`${type.display} mt-5 max-w-3xl !text-[2rem] sm:!text-[2.75rem]`}>
            GATE {s.subject} ({s.code}): previous year papers, topic-wise weightage and the 2027 syllabus
          </h1>
          <p className={`${type.lead} mt-5 max-w-2xl`}>
            How the {s.code} marks were spread across topics in {s.papers.length} official papers from {s.years[0]} to{" "}
            {s.years.at(-1)}, what changed for GATE 2027, and every paper with its official answer key.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/gate/practice" size="lg">Take a {s.code} paper as a timed test</ButtonLink>
            <ButtonLink href="/gate/2027" variant="secondary" size="lg">GATE 2027 dates and changes</ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="grid grid-cols-[minmax(0,1fr)] gap-16 py-14 sm:py-20">
        <section aria-labelledby="weightage">
          <Eyebrow>Topic-wise weightage</Eyebrow>
          <h2 id="weightage" className={`${type.h2} mt-3`}>GATE {s.code} marks by topic, {s.years[0]}–{s.years.at(-1)}</h2>
          <p className={`${type.body} mt-3 max-w-2xl`}>
            Marks out of the 85 subject marks in each paper (General Aptitude adds 15), counted from the official papers and
            keys. Where a year had two sets, the sets are averaged. On average, {s.topics[0].name} carried the most marks (
            {s.topics[0].average} per paper){swing && swing.max - swing.min >= 4 ? `; ${swing.name} varied the most, from ${swing.min} to ${swing.max} marks` : ""}.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="sticky left-0 bg-zinc-50 px-4 py-3 font-medium">Topic</th>
                  <th className="px-3 py-3 text-right font-medium text-ink">Average</th>
                  {s.years.map((y) => (
                    <th key={y} className="px-3 py-3 text-right font-medium tabular-nums">{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {s.topics.map((t) => (
                  <tr key={t.name}>
                    <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-2.5 text-zinc-800">{t.name}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink">{t.average}</td>
                    {s.years.map((y) => (
                      <td key={y} className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{t.byYear[y] ?? "–"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {change && (
          <section aria-labelledby="syllabus">
            <Eyebrow>GATE 2027 syllabus</Eyebrow>
            <h2 id="syllabus" className={`${type.h2} mt-3`}>
              {change.status === "unchanged" ? `GATE 2027 ${s.code} syllabus: no topic changes` : `What changed in the GATE 2027 ${s.code} syllabus`}
            </h2>
            <p className={`${type.body} mt-3 max-w-2xl`}>{change.summary}</p>
            {change.status !== "unchanged" && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {(
                  [
                    ["Added or expanded", change.added, "text-emerald-700"],
                    ["Removed", change.removed, "text-rose-700"],
                  ] as const
                ).map(([title, list, tone]) => (
                  <div key={title} className="rounded-2xl border border-zinc-200 p-5">
                    <h3 className={`text-sm font-semibold ${tone}`}>{title}</h3>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-zinc-700">
                      {list.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm text-zinc-500">
              Compared line by line with the official 2026 syllabus. Source:{" "}
              <a href={GATE_2027.brochure} className="text-brand underline underline-offset-2" rel="noopener" target="_blank">
                GATE 2027 information brochure, {GATE_2027.organiser}
              </a>{" "}
              (revised {GATE_2027.brochureRevised}).
            </p>
          </section>
        )}

        <section aria-labelledby="papers">
          <Eyebrow>Official papers</Eyebrow>
          <h2 id="papers" className={`${type.h2} mt-3`}>GATE {s.code} previous year papers with answer keys</h2>
          <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {s.papers.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/gate/papers/${p.slug}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:border-brand hover:text-brand"
                >
                  <span>
                    <span className="font-medium tabular-nums">{p.year}</span>
                    {p.set && <span className="text-zinc-500"> · Set {p.set}</span>}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq">
          <h2 id="faq" className={type.h2}>Questions about GATE {s.code}</h2>
          <FaqList faqs={faqsFor(s)} className="mt-6 max-w-3xl" />
        </section>
      </Container>
    </div>
  );
}
