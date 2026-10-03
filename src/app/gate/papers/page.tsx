// src/app/gate/papers/page.tsx — every official GATE paper we carry, grouped by subject. Each links to
// its own page with the answer key, topic-wise marks and solved questions.
import { PaperFilter } from "@/components/gate/PaperFilter";
import { FaqList } from "@/components/site/FaqList";
import { TrialButton } from "@/components/site/AccessCta";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink, Container, type } from "@/components/site/ui";
import { PaperStackScene } from "@/components/motion/scenes";
import { NEGATIVE_MARKING, PAPER_HOURS } from "@/lib/gate/exam-facts";
import { getPapers } from "@/lib/gate/papers.server";
import { breadcrumbLd, JsonLd, pageMeta } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata() {
  const papers = await getPapers();
  const years = papers.map((p) => p.year);
  return pageMeta({
    title: `GATE previous year question papers with answer keys (${Math.min(...years)}–${Math.max(...years)})`,
    description: `${papers.length} official GATE papers across ${new Set(papers.map((p) => p.code)).size} subjects, each with the official answer key, topic-wise marks and solved questions. Take any of them as a ${PAPER_HOURS}-hour timed test.`,
    path: "/gate/papers",
  });
}

export default async function PapersPage() {
  const papers = await getPapers();
  const bySubject = new Map<string, typeof papers>();
  for (const p of papers) bySubject.set(p.subject, [...(bySubject.get(p.subject) ?? []), p]);
  const subjects = [...bySubject.entries()].sort((a, b) => b[1].length - a[1].length);
  const faqs = [
    {
      q: "Which GATE papers are available on Lemyte?",
      a: `${papers.length} official papers: ${subjects.map(([name, list]) => `${name} (${list.length})`).join(", ")}. Each one has its own page with the official answer key.`,
    },
    {
      q: "Are these the real GATE questions?",
      a: "Yes. Question text and figures are taken from the official papers, and answers come from the official answer keys published by the organising institutes, including marks-to-all decisions and range answers for numerical questions.",
    },
    { q: "How is a GATE paper marked?", a: `Each paper has 65 questions for 100 marks, taken in ${PAPER_HOURS} hours. ${NEGATIVE_MARKING}` },
    {
      q: "Can I take a past paper as a timed test?",
      a: `Yes. Every paper runs as a full ${PAPER_HOURS}-hour test on a screen laid out like the real exam, with the virtual calculator, and is marked with the official key. A short General Aptitude demo is free.`,
    },
  ];

  return (
    <div className="bg-white text-ink">
      <JsonLd data={breadcrumbLd([{ name: "GATE", path: "/gate" }, { name: "PYQs", path: "/gate/papers" }])} />
      <PageHero
        eyebrow="GATE PYQs"
        title="GATE previous year papers with answer keys"
        lead={`${papers.length} official GATE papers. Each page has the official answer key, how the marks were split by topic, and solved questions. Take any paper as a timed test marked the way GATE marks it.`}
        art={<PaperStackScene />}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <TrialButton size="lg" label="Try the free demo" paidLabel="Start a PYQ test" paidHref="/gate/practice" />
          <ButtonLink href="/gate/pricing" variant="secondary" size="lg">See plans</ButtonLink>
        </div>
      </PageHero>

      <Container className="grid grid-cols-[minmax(0,1fr)] gap-12 py-14 sm:py-20">
        <PaperFilter
          groups={subjects.map(([name, list]) => ({
            code: list[0].code,
            name,
            papers: list.map((p) => ({ slug: p.slug, year: p.year, set: p.set })),
          }))}
        />

        <section aria-labelledby="faq">
          <h2 id="faq" className={type.h2}>Questions about GATE PYQs</h2>
          <FaqList faqs={faqs} className="mt-6 max-w-3xl" />
        </section>
      </Container>
    </div>
  );
}
