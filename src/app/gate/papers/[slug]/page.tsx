// src/app/gate/papers/[slug]/page.tsx — one official GATE paper: structure, topic-wise marks, the
// official answer key and a few fully solved questions. Everything here comes from the paper itself.
import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import GateMarkdown, { GateOptionMarkdown } from "@/components/GateMarkdown";
import { SyllabusBadge } from "@/components/gate/SyllabusBadge";
import { FaqList } from "@/components/site/FaqList";
import { TrialButton } from "@/components/site/AccessCta";
import { ButtonLink, Container, Eyebrow, type } from "@/components/site/ui";
import { NEGATIVE_MARKING, ORGANISER, PAPER_HOURS } from "@/lib/gate/exam-facts";
import { getPaper, getPapers, type Paper } from "@/lib/gate/papers.server";
import { abs, breadcrumbLd, type Faq, JsonLd, pageMeta } from "@/lib/seo";

export const revalidate = 86400;

export async function generateStaticParams() {
  return (await getPapers()).map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

const fullName = (p: Paper) => `GATE ${p.year} ${p.subject}${p.set ? ` (Set ${p.set})` : ""}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const paper = await getPaper((await params).slug);
  if (!paper) return {};
  return pageMeta({
    title: `${paper.name} question paper with answer key and solutions`,
    description: `${fullName(paper)}: all ${paper.questions} questions with the official answer key, topic-wise marks and ${paper.samples.length} fully solved questions. Take the whole paper as a ${PAPER_HOURS}-hour timed test.`,
    path: `/gate/papers/${paper.slug}`,
  });
}

function stats(p: Paper) {
  const q = p.questionList;
  const sum = (xs: typeof q) => xs.reduce((n, x) => n + x.marks, 0);
  const ga = q.filter((x) => x.section === "GA");
  const core = q.filter((x) => x.section === "CORE");
  const byType = (t: string) => q.filter((x) => x.type === t).length;
  const topics = new Map<string, { marks: number; count: number }>();
  for (const x of core) {
    const t = topics.get(x.topic) ?? { marks: 0, count: 0 };
    topics.set(x.topic, { marks: t.marks + x.marks, count: t.count + 1 });
  }
  return {
    total: sum(q),
    ga: { count: ga.length, marks: sum(ga) },
    core: { count: core.length, marks: sum(core) },
    mcq: byType("MCQ"),
    msq: byType("MSQ"),
    nat: byType("NAT"),
    mta: q.filter((x) => x.marksToAll),
    outOfSyllabus: q.filter((x) => x.syllabusNote),
    topics: [...topics.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.marks - a.marks),
  };
}

function faqsFor(p: Paper, s: ReturnType<typeof stats>): Faq[] {
  const top = s.topics.slice(0, 3).map((t) => `${t.name} (${t.marks} marks)`);
  const types = [`${s.mcq} MCQs`, s.msq && `${s.msq} MSQs`, `${s.nat} numerical answer (NAT) questions`].filter(Boolean).join(", ");
  return [
    {
      q: `How many questions are in the ${p.name} paper?`,
      a: `${p.questions} questions for ${s.total} marks: ${s.ga.count} General Aptitude questions worth ${s.ga.marks} marks and ${s.core.count} ${p.subject} questions worth ${s.core.marks} marks. By type, there were ${types}. The paper lasted ${PAPER_HOURS} hours.`,
    },
    { q: `Is there negative marking in ${p.name}?`, a: `Yes, for MCQs only. ${NEGATIVE_MARKING}` },
    {
      q: `Which topics carried the most marks in ${p.name}?`,
      a: `Outside General Aptitude, the biggest topics were ${top.join(", ")}. The full topic-wise split is in the table on this page.`,
    },
    {
      q: `Were any ${p.name} questions awarded marks to all?`,
      a: s.mta.length
        ? `Yes. The official key awarded full marks to everyone for question${s.mta.length > 1 ? "s" : ""} ${s.mta.map((x) => x.n).join(", ")}.`
        : "No. Every question was graded with the answer in the official key.",
    },
    {
      q: `Where does this ${p.name} answer key come from?`,
      a: `From the official answer key published by ${ORGANISER[p.year] ?? "the organising institute"}, which organised GATE ${p.year}. Range answers for numerical questions and questions with more than one accepted answer are kept exactly as the key gives them.`,
    },
  ];
}

const plain = (md: string) =>
  md.replace(/!\[[^\]]*\]\([^)]*\)/g, "[figure]").replace(/\$+/g, "").replace(/[*_`#>|]/g, "").replace(/\s+/g, " ").trim();

function quizLd(p: Paper) {
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: `${p.name} solved questions`,
    about: { "@type": "Thing", name: `GATE ${p.subject}` },
    educationalLevel: "Undergraduate engineering",
    url: abs(`/gate/papers/${p.slug}#solved`),
    hasPart: p.samples.map((q) => ({
      "@type": "Question",
      eduQuestionType: q.type === "NAT" ? "Short answer" : q.type === "MSQ" ? "Checkbox" : "Multiple choice",
      text: plain(q.markdown).slice(0, 600),
      ...(q.options.length
        ? {
            suggestedAnswer: q.options.filter((o) => !o.correct).map((o) => ({ "@type": "Answer", text: `(${o.id}) ${plain(o.markdown)}` })),
            acceptedAnswer: q.options.filter((o) => o.correct).map((o) => ({ "@type": "Answer", text: `(${o.id}) ${plain(o.markdown)}` })),
          }
        : { acceptedAnswer: { "@type": "Answer", text: q.answer } }),
    })),
  };
}

const TYPE_LABEL = { MCQ: "MCQ", MSQ: "MSQ", NAT: "Numerical" } as const;

export default async function PaperPage({ params }: Props) {
  const paper = await getPaper((await params).slug);
  if (!paper) notFound();
  const s = stats(paper);
  const faqs = faqsFor(paper, s);
  const all = await getPapers();
  const sameSubject = all.filter((p) => p.code === paper.code && p.slug !== paper.slug);
  const sameYear = all.filter((p) => p.year === paper.year && p.code !== paper.code);
  const crumbs = [
    { name: "GATE", path: "/gate" },
    { name: `GATE ${paper.code}`, path: `/gate/${paper.code.toLowerCase()}` },
    { name: paper.name, path: `/gate/papers/${paper.slug}` },
  ];

  return (
    <div className="bg-white text-ink">
      <JsonLd data={[breadcrumbLd(crumbs), quizLd(paper)]} />

      <section className="border-b border-zinc-100 bg-zinc-50/60">
        <Container className="py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
            {crumbs.map((c, i) => (
              <span key={c.path}>
                {i > 0 && <span className="mx-2 text-zinc-300">/</span>}
                {i < crumbs.length - 1 ? <Link href={c.path} className="hover:text-ink">{c.name}</Link> : <span className="text-zinc-700">{c.name}</span>}
              </span>
            ))}
          </nav>
          <h1 className={`${type.display} mt-5 max-w-3xl !text-[2rem] sm:!text-[2.75rem]`}>
            {paper.name} question paper with answer key and solutions
          </h1>
          <p className={`${type.lead} mt-5 max-w-2xl`}>
            The official {fullName(paper)} paper, organised by {ORGANISER[paper.year] ?? "the organising institute"}: {paper.questions}{" "}
            questions for {s.total} marks in {PAPER_HOURS} hours. Below is how the marks were split by topic, the complete
            official answer key and {paper.samples.length} questions solved step by step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/gate/practice" size="lg">Take this paper as a timed test</ButtonLink>
            <TrialButton variant="secondary" size="lg" label="Try the free demo" />
          </div>
          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[
              [`${s.ga.count} · ${s.ga.marks} marks`, "General Aptitude"],
              [`${s.core.count} · ${s.core.marks} marks`, paper.subject],
              [`${s.mcq} / ${s.msq} / ${s.nat}`, "MCQ / MSQ / NAT"],
              [s.mta.length ? `Q ${s.mta.map((x) => x.n).join(", ")}` : "None", "Marks to all"],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="text-xs text-zinc-500">{k}</dt>
                <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {s.outOfSyllabus.length > 0 && (
            <p className="mt-6 max-w-2xl text-sm text-zinc-600">
              <SyllabusBadge note="Not in the GATE 2027 syllabus" compact /> {s.outOfSyllabus.length} question
              {s.outOfSyllabus.length > 1 ? "s" : ""} (Q {s.outOfSyllabus.map((x) => x.n).join(", ")}) {s.outOfSyllabus.length > 1 ? "are" : "is"} on
              topics removed from the GATE 2027 syllabus. They are marked in the answer key below.{" "}
              <Link href={`/gate/${paper.code.toLowerCase()}#syllabus`} className="text-brand underline underline-offset-2">
                What changed for {paper.code}
              </Link>
            </p>
          )}
        </Container>
      </section>

      <Container className="grid grid-cols-[minmax(0,1fr)] gap-16 py-14 sm:py-20">
        {/* Topic-wise marks */}
        <section aria-labelledby="topics">
          <Eyebrow>Where the marks were</Eyebrow>
          <h2 id="topics" className={`${type.h2} mt-3`}>{paper.name} topic-wise marks</h2>
          <p className={`${type.body} mt-3 max-w-2xl`}>
            {paper.subject} questions only; General Aptitude adds {s.ga.marks} marks on top. The top three topics carried{" "}
            {s.topics.slice(0, 3).reduce((n, t) => n + t.marks, 0)} of the {s.core.marks} subject marks.
          </p>
          <div className="mt-6 max-w-2xl overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Topic</th>
                  <th className="px-4 py-3 text-right font-medium">Questions</th>
                  <th className="px-4 py-3 text-right font-medium">Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {s.topics.map((t) => (
                  <tr key={t.name}>
                    <td className="px-4 py-2.5 text-zinc-800">{t.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">{t.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">{t.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Solved questions */}
        <section aria-labelledby="solved-h" id="solved">
          <Eyebrow>Free solved questions</Eyebrow>
          <h2 id="solved-h" className={`${type.h2} mt-3`}>{paper.samples.length} solved questions from {paper.name}</h2>
          <p className={`${type.body} mt-3 max-w-2xl`}>
            Question text and figures as in the official paper, the answer from the official key, and a worked solution. The
            other {paper.questions - paper.samples.length} solutions are in your report after you take the paper.
          </p>
          <div className="mt-8 grid gap-6">
            {paper.samples.map((q) => (
              <article key={q.n} id={`q${q.n}`} className="rounded-2xl border border-zinc-200 p-5 sm:p-6">
                <p className="text-xs font-medium text-zinc-500">
                  Q{q.n} · {q.section === "GA" ? "General Aptitude" : q.topic} · {TYPE_LABEL[q.type]} · {q.marks} mark{q.marks > 1 ? "s" : ""}
                </p>
                {q.syllabusNote && (
                  <p className="mt-2">
                    <SyllabusBadge note={q.syllabusNote} />
                  </p>
                )}
                <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={`Question ${q.n}`}>
                  <GateMarkdown content={q.markdown} className="text-[15px] leading-relaxed text-zinc-800" />
                </div>
                {q.options.length > 0 && (
                  <ul className="mt-4 grid gap-2">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-[15px] ${o.correct ? "border-emerald-300 bg-emerald-50/60" : "border-zinc-200"}`}
                      >
                        <span className="font-medium text-zinc-500">({o.id})</span>
                        <GateOptionMarkdown content={o.markdown} className="min-w-0 flex-1 overflow-x-auto" />
                        {o.correct && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Correct" />}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-sm font-semibold text-ink">
                  Answer (official key): <span className="text-emerald-700">{q.answer}</span>
                </p>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="text-sm font-semibold text-ink">Solution</p>
                  <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={`Solution to Q${q.n}`}>
                    <GateMarkdown content={q.explanation} className="text-[15px] leading-relaxed text-zinc-700" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Answer key */}
        <section aria-labelledby="key">
          <Eyebrow>Official answer key</Eyebrow>
          <h2 id="key" className={`${type.h2} mt-3`}>{paper.name} answer key</h2>
          <p className={`${type.body} mt-3 max-w-2xl`}>
            All {paper.questions} answers from the official key. Numerical answers are ranges; “or” means the key accepts either
            answer.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200" tabIndex={0} role="region" aria-label="Answer key table">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Q</th>
                  <th className="px-4 py-3 font-medium">Topic</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Marks</th>
                  <th className="px-4 py-3 font-medium">Answer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paper.questionList.map((q) => (
                  <tr key={q.n}>
                    <td className="px-4 py-2 tabular-nums text-zinc-500">{q.n}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {q.topic}
                      {q.syllabusNote && (
                        <span className="ml-2">
                          <SyllabusBadge note={q.syllabusNote} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{TYPE_LABEL[q.type]}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-600">{q.marks}</td>
                    <td className="px-4 py-2 font-medium tabular-nums text-ink">{q.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq">
          <h2 id="faq" className={type.h2}>Questions about {paper.name}</h2>
          <FaqList faqs={faqs} className="mt-6 max-w-3xl" />
        </section>

        {/* Related papers */}
        <section aria-labelledby="more" className="grid gap-8 sm:grid-cols-2">
          <h2 id="more" className="sr-only">More GATE papers</h2>
          {[
            [`Other GATE ${paper.code} papers`, sameSubject, `/gate/${paper.code.toLowerCase()}`, `GATE ${paper.code} topic-wise weightage and 2027 syllabus`],
            [`Other GATE ${paper.year} papers`, sameYear, "/gate/2027", "GATE 2027 dates and syllabus changes"],
          ].map(([title, list, href, label]) => (
            <div key={title as string}>
              <p className="text-sm font-semibold text-ink">{title as string}</p>
              <Link href={href as string} className="mt-1 inline-block text-sm text-brand underline underline-offset-2">
                {label as string}
              </Link>
              <ul className="mt-3 flex flex-wrap gap-2">
                {(list as typeof all).map((p) => (
                  <li key={p.slug}>
                    <Link href={`/gate/papers/${p.slug}`} className="inline-block rounded-md border border-zinc-200 px-2.5 py-1 text-sm text-zinc-600 hover:border-zinc-300 hover:text-ink">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </Container>
    </div>
  );
}
