import Link from "next/link";
import type { ReactNode } from "react";

import { LEGAL } from "@/lib/legal";

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund & Cancellation" },
  { href: "/shipping-policy", label: "Shipping & Delivery" },
  { href: "/contact", label: "Contact Us" },
];

export function LegalPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-800">
      <header className="border-b border-zinc-200 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-black tracking-tight text-zinc-950">
            {LEGAL.brand}
          </Link>
          <Link href="/gate" className="text-sm font-semibold text-zinc-500 hover:text-zinc-950">
            GATE practice →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective date: {LEGAL.effectiveDate}</p>
        {intro && <div className="mt-6 text-base leading-7">{intro}</div>}
        <div className="mt-8 space-y-8 text-[15px] leading-7">{children}</div>
      </main>

      <footer className="border-t border-zinc-200 px-4 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 text-xs text-zinc-500">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-zinc-950">
                {l.label}
              </Link>
            ))}
          </nav>
          <p>
            © {new Date().getFullYear()} {LEGAL.brand} — {LEGAL.company}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-black tracking-tight text-zinc-950">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${LEGAL.email}`} className="font-semibold text-zinc-950 underline underline-offset-2">
      {LEGAL.email}
    </a>
  );
}
