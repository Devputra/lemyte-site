import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
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
    <div className="min-h-screen bg-white text-zinc-700">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective date: {LEGAL.effectiveDate}</p>
        {intro && <div className="mt-6 text-base leading-7">{intro}</div>}
        <div className="mt-10 space-y-9 text-[15px] leading-7">{children}</div>
        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-200 pt-6 text-sm">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-zinc-500 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
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
    <a href={`mailto:${LEGAL.email}`} className="font-medium text-brand underline-offset-2 hover:underline">
      {LEGAL.email}
    </a>
  );
}
