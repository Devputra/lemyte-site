// src/app/sitemap.ts — /sitemap.xml: every public page, including one page per official GATE paper.
// Private routes (tests, reports, dashboard, auth) are left out here and disallowed in robots.ts.
import type { MetadataRoute } from "next";

import { getPapers } from "@/lib/gate/papers.server";
import { abs } from "@/lib/seo";

export const revalidate = 3600;

const PAGES: [path: string, priority: number][] = [
  ["/", 1],
  ["/gate", 0.9],
  ["/gate/papers", 0.9],
  ["/gate/pricing", 0.8],
  ["/gate/demo", 0.7],
  ["/gate/practice", 0.6],
  ["/gate/practice/topics", 0.6],
  ["/gate/ranked", 0.5],
  ["/gate/instructions", 0.4],
  ["/about", 0.6],
  ["/contact", 0.4],
  ["/terms", 0.2],
  ["/privacy", 0.2],
  ["/refund-policy", 0.2],
  ["/shipping-policy", 0.2],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const papers = await getPapers();
  return [
    ...PAGES.map(([path, priority]) => ({ url: abs(path), priority })),
    ...papers.map((p) => ({ url: abs(`/gate/papers/${p.slug}`), priority: 0.7 })),
  ];
}
