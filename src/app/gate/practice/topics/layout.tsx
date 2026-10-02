// src/app/gate/practice/topics/layout.tsx — metadata for a client-rendered page.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "GATE topic-wise practice questions",
  description: "Choose a GATE topic and practise 5 to 30 past-paper questions from it, timed and marked like the exam, with worked solutions.",
  path: "/gate/practice/topics",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
