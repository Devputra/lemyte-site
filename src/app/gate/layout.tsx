// src/app/gate/layout.tsx
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ChromeGate } from "@/components/site/ChromeGate";
import { SiteFooter, SiteHeader, type NavItem } from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "GATE practice tests — Lemyte",
  description:
    "Official GATE past papers as timed tests, marked with the official answer key, with topic practice and a progress tracker.",
};

const GATE_NAV: NavItem[] = [
  { href: "/gate", label: "Overview" },
  { href: "/gate/2027", label: "GATE 2027" },
  { href: "/gate/papers", label: "Papers" },
  { href: "/gate/practice", label: "PYQ tests" },
  { href: "/gate/practice/topics", label: "Topic practice" },
  { href: "/gate/ranked", label: "Ranked" },
  { href: "/gate/pricing", label: "Pricing" },
];

export default function GateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <ChromeGate header={<SiteHeader nav={GATE_NAV} />} footer={<SiteFooter />}>
        <main>{children}</main>
      </ChromeGate>
    </div>
  );
}
