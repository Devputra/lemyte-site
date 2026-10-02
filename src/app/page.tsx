// src/app/page.tsx — Lemyte home (content + motion live in src/components/home/Home.tsx).
import type { Metadata } from "next";

import Home from "@/components/home/Home";
import { getCatalog } from "@/lib/gate/catalog.server";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Lemyte — GATE practice tests from official past papers",
  description:
    "Exam-style online tests built from official past papers and marked the way the real exam marks them. Starting with GATE: every recent paper as a timed test, with a topic-wise report.",
  path: "/",
  exactTitle: true,
});

export const revalidate = 3600; // numbers and prices come from the database

export default async function HomePage() {
  const catalog = await getCatalog();
  return (
    <div className="bg-white text-ink">
      <SiteHeader />
      <main>
        <Home catalog={catalog} />
      </main>
      <SiteFooter />
    </div>
  );
}
