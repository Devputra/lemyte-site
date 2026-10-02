// src/app/llms.txt/route.ts — /llms.txt (llmstxt.org): a plain-Markdown map of the site for AI
// assistants and answer engines. Built from the same data as the pages, so it never goes stale.
import { fmtInr } from "@/lib/gate/catalog";
import { getCatalog } from "@/lib/gate/catalog.server";
import { NEGATIVE_MARKING, PAPER_HOURS } from "@/lib/gate/exam-facts";
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

## Main pages
- [GATE overview](${abs("/gate")}): how the tests, reports and topic practice work
- [GATE past papers](${abs("/gate/papers")}): all papers with answer keys
- [Pricing](${abs("/gate/pricing")}): plans and what each includes
- [Free demo test](${abs("/gate/demo")})
- [About Lemyte](${abs("/about")}): who runs it and why
- [Contact](${abs("/contact")})

## GATE papers with answer keys and solved questions
${[...bySubject.entries()]
  .map(([name, list]) => `### ${name}\n${list.map((p) => `- [${p.name}](${abs(`/gate/papers/${p.slug}`)})`).join("\n")}`)
  .join("\n\n")}

## Policies
- [Terms](${abs("/terms")}) · [Privacy](${abs("/privacy")}) · [Refunds](${abs("/refund-policy")}) · [Delivery](${abs("/shipping-policy")})
`;
  return new Response(text, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
