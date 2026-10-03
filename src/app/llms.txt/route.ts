// src/app/llms.txt/route.ts — /llms.txt (llmstxt.org): a plain-Markdown map of the site for AI
// assistants and answer engines. Built from the same data as the pages, so it never goes stale.
import { fmtInr } from "@/lib/gate/catalog";
import { getCatalog } from "@/lib/gate/catalog.server";
import { NEGATIVE_MARKING, PAPER_HOURS } from "@/lib/gate/exam-facts";
import { GATE_2027, SYLLABUS_2027 } from "@/lib/gate/gate2027";
import { getPapers } from "@/lib/gate/papers.server";
import { LEGAL } from "@/lib/legal";
import { abs } from "@/lib/seo";

export const revalidate = 3600;

export async function GET() {
  const [{ subjects, totals, plans }, papers] = await Promise.all([getCatalog(), getPapers()]);
  const bySubject = new Map<string, typeof papers>();
  for (const p of papers) bySubject.set(`${p.subject} (${p.code})`, [...(bySubject.get(`${p.subject} (${p.code})`) ?? []), p]);

  const text = `# Lemyte

> Lemyte (${LEGAL.website}) runs exam-style online tests for GATE, India's Graduate Aptitude Test in Engineering. It has ${totals.papers} official GATE papers (${totals.questions.toLocaleString("en-IN")} questions) across ${totals.subjects} subjects, each taken as a timed ${PAPER_HOURS}-hour test and marked with the official answer key, followed by a topic-wise report.

Lemyte is run by ${LEGAL.company}, Chennai, India. It is not affiliated with IISc, the IITs or the GATE organising institutes.

## Facts
- Subjects: ${subjects.map((s) => `${s.name} (${s.code}, ${s.papers} papers, ${s.years})`).join("; ")}.
- Every paper: 65 questions, 100 marks (General Aptitude 15 marks, subject 85 marks), ${PAPER_HOURS} hours.
- Marking: ${NEGATIVE_MARKING}
- Answers come from the official answer keys, including marks-to-all decisions and range answers for numerical questions.
- Plans: ${plans.map((p) => `${p.name} ${fmtInr(p.priceInr)}`).join("; ")}. A short General Aptitude demo test is free.
- Contact: ${LEGAL.email}, ${LEGAL.phone}.

## GATE 2027
- Organised by ${GATE_2027.organiser}; exam on 6, 7, 13, 14, 20 and 21 February 2027 (forenoon ${GATE_2027.sessions.forenoon}, afternoon ${GATE_2027.sessions.afternoon}); results on 19 March 2027. Source: ${GATE_2027.brochure}
- ${GATE_2027.papers} papers, including the new ${GATE_2027.newPaper} paper.
- Syllabus changes from 2026 (compared line by line by Lemyte): ${Object.entries(SYLLABUS_2027).map(([c, s]) => `${c}: ${s.status === "unchanged" ? "no topic changes" : "revised"}`).join("; ")}. Details: ${abs("/gate/2027")}

## Main pages
- [GATE 2027](${abs("/gate/2027")}): dates, pattern and syllabus changes by subject
- [GATE overview](${abs("/gate")}): how the tests, reports and topic practice work
- [GATE PYQs](${abs("/gate/papers")}): all papers with answer keys
- [Pricing](${abs("/gate/pricing")}): plans and what each includes
- [Free demo test](${abs("/gate/demo")})
- [About Lemyte](${abs("/about")}): who runs it and why
- [Contact](${abs("/contact")})

## GATE papers with answer keys and solved questions
${[...bySubject.entries()]
  .map(([name, list]) => `### ${name}: [topic-wise weightage and 2027 syllabus](${abs(`/gate/${list[0].code.toLowerCase()}`)})\n${list.map((p) => `- [${p.name}](${abs(`/gate/papers/${p.slug}`)})`).join("\n")}`)
  .join("\n\n")}

## Policies
- [Terms](${abs("/terms")}) · [Privacy](${abs("/privacy")}) · [Refunds](${abs("/refund-policy")}) · [Delivery](${abs("/shipping-policy")})
`;
  return new Response(text, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
