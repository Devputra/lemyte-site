// src/app/page.tsx — Lemyte home (content + motion live in src/components/home/Home.tsx).
import type { Metadata } from "next";

import Home from "@/components/home/Home";
import { getCatalog } from "@/lib/gate/catalog.server";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "Lemyte — Practice tests for competitive exams",
  description:
    "Exam-style online tests built from official past papers and marked the way the real exam marks them. Starting with GATE.",
};

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
