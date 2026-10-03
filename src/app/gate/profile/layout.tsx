// src/app/gate/profile/layout.tsx — private page: kept out of search results.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Your profile",
  description: "Your details, plan, payments and password.",
  path: "/gate/profile",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
