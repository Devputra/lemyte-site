// src/app/gate/ranked/layout.tsx — metadata for a client-rendered page.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "GATE ranked mock tests",
  description: "Scheduled GATE tests with one counted attempt, ranked against everyone who took the same test.",
  path: "/gate/ranked",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
