// src/app/about/layout.tsx — metadata and founder structured data for /about (the page holds the content).
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { founderLd, JsonLd, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About",
  description:
    "Lemyte is an Indian education company that builds exam-style assessments, founded by an engineer whose own exam preparation shaped it. GATE is our first product.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={founderLd} />
      {children}
    </>
  );
}
