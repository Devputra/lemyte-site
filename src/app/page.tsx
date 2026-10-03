// src/app/page.tsx — Lemyte home (content + motion live in src/components/home/Home.tsx).
import type { Metadata } from "next";

import Home from "@/components/home/Home";
import { getCatalog } from "@/lib/gate/catalog.server";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Lemyte — GATE 2027 test series from official PYQs",
  description:
    "Lemyte's GATE 2027 test series: official GATE papers as timed 3-hour tests, marked with the official answer key, with a topic-wise report and GATE 2027 syllabus changes for every subject.",
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
