// src/app/gate/practice/layout.tsx — metadata for a client-rendered page.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "GATE previous year papers as timed tests",
  description: "Pick any official GATE paper and take it as a full 3-hour test on an exam-style screen, marked with the official answer key.",
  path: "/gate/practice",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
