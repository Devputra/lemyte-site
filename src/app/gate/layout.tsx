// src/app/gate/layout.tsx
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter, SiteHeader, type NavItem } from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "GATE assessment — Lemyte",
  description:
    "Official GATE past papers as timed tests, marked with the official answer key, with topic practice and a progress tracker.",
};

const GATE_NAV: NavItem[] = [
  { href: "/gate", label: "Overview" },
  { href: "/gate/practice", label: "Past papers" },
  { href: "/gate/practice/topics", label: "Topic practice" },
  { href: "/gate/ranked", label: "Ranked" },
  { href: "/gate/pricing", label: "Pricing" },
];

export default function GateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <SiteHeader nav={GATE_NAV} app />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
