// src/app/gate/layout.tsx
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ChromeGate } from "@/components/site/ChromeGate";
import { GATE_NAV, SiteFooter, SiteHeader } from "@/components/site/SiteChrome";

export const metadata: Metadata = {
  title: "GATE practice tests — Lemyte",
  description:
    "Official GATE PYQs as timed tests, marked with the official answer key, with topic practice and a progress tracker.",
};

export default function GateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <ChromeGate header={<SiteHeader nav={GATE_NAV} />} footer={<SiteFooter />}>
        <main>{children}</main>
      </ChromeGate>
    </div>
  );
}
