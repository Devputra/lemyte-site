// src/app/gate/instructions/layout.tsx — metadata for a client-rendered page.
import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "GATE test instructions",
  description: "How the Lemyte GATE test screen works: timer, question palette, marking for review, the virtual calculator and negative marking.",
  path: "/gate/instructions",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
