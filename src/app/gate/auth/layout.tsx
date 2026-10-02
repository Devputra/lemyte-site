// src/app/gate/auth/layout.tsx — private page: kept out of search results.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Sign in",
  description: "Sign in or create your Lemyte account.",
  path: "/gate/auth/sign-in",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
