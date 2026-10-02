// src/app/coming-soon/layout.tsx — private page: kept out of search results.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Coming soon",
  description: "More exams are coming to Lemyte.",
  path: "/coming-soon",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
