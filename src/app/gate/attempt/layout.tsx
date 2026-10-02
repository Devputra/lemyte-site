// src/app/gate/attempt/layout.tsx — private page: kept out of search results.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Test in progress",
  description: "GATE test.",
  path: "/gate/attempt",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
