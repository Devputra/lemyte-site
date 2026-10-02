// src/app/gate/dashboard/layout.tsx — private page: kept out of search results.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Your dashboard",
  description: "Your GATE tests, reports and progress.",
  path: "/gate/dashboard",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
