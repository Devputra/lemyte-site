// src/app/gate/layout.tsx
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GATE CS Practice — Lemyte",
  description:
    "Calibrated GATE CS mocks, PYQ practice, ranked attempts, and report-first analytics for serious aspirants.",
};

const navItems = [
  { href: "/gate", label: "Overview" },
  { href: "/gate/demo", label: "Demo" },
  { href: "/gate/practice", label: "Practice" },
  { href: "/gate/practice/topics", label: "Topics" },
  { href: "/gate/ranked", label: "Ranked" },
  { href: "/gate/pricing", label: "Plans" },
];

export default function GateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" className="shrink-0 text-lg font-black tracking-tight">
            lemyte<span className="text-[#193bc8]">/&gt;</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/gate/dashboard"
              className="hidden rounded-full border border-zinc-300 px-4 py-2 text-sm font-bold text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white sm:inline-flex"
            >
              Dashboard
            </Link>
            <Link
              href="/gate/demo"
              className="rounded-full bg-[#193bc8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#102b9f]"
            >
              Start Demo
            </Link>
          </div>
        </div>

        <div className="border-t border-zinc-100 px-4 py-2 md:hidden">
          <div className="flex gap-2 overflow-x-auto text-sm font-semibold text-zinc-600">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full bg-zinc-50 px-3 py-1.5"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <section className="border-t border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-xs leading-5 text-zinc-500">
        Lemyte is not affiliated with IITs, IISc, GATE organizing institutes, or TCS iON. “GATE” is used only to describe exam preparation.
      </section>

      <footer className="border-t border-zinc-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-black tracking-tight text-zinc-950">
              lemyte<span className="text-[#193bc8]">/&gt;</span>
            </div>
            <p className="mt-1 text-xs">
              © {new Date().getFullYear()} DXOCTAGON (OPC) Pvt Ltd. Built for measurable preparation.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <Link href="/gate" className="hover:text-zinc-950">GATE</Link>
            <Link href="/gate/practice" className="hover:text-zinc-950">Practice</Link>
            <Link href="/gate/ranked" className="hover:text-zinc-950">Ranked</Link>
            <Link href="/gate/pricing" className="hover:text-zinc-950">Plans</Link>
            <Link href="/" className="hover:text-zinc-950">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}