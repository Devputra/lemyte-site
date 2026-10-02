// src/app/gate/report/layout.tsx — private page: kept out of search results.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Test report",
  description: "Your GATE test report.",
  path: "/gate/report",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
