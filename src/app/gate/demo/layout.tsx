// src/app/gate/demo/layout.tsx — metadata for a client-rendered page.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Free GATE mock test",
  description: "Ten General Aptitude questions from real GATE papers in 30 minutes, on the same exam screen and report as the full tests. Free, no payment details needed.",
  path: "/gate/demo",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
