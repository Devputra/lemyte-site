// src/app/gate/papers/[slug]/opengraph-image.tsx — share card for one paper page.
import { OG_SIZE, ogImage } from "@/lib/og";
import { getPaper, getPapers } from "@/lib/gate/papers.server";

export const alt = "GATE question paper with answer key and solutions";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 86400;

export async function generateStaticParams() {
  return (await getPapers()).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const paper = await getPaper((await params).slug);
  return ogImage({
    eyebrow: paper ? `GATE ${paper.year} · ${paper.subject}` : "GATE PYQs",
    title: paper ? `${paper.name} question paper with answer key and solutions` : "GATE question papers with answer keys",
    stats: paper
      ? [
          [String(paper.questions), "questions"],
          ["100", "marks"],
          [String(paper.samples.length), "solved free"],
        ]
      : [],
  });
}
