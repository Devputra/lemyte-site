// src/components/site/SiteChrome.tsx — shared header and footer for every public page.
import Image from "next/image";
import Link from "next/link";

import { LEGAL } from "@/lib/legal";

import { HeaderActions } from "./AccessCta";
import { Container } from "./ui";

export type NavItem = { href: string; label: string };

const HOME_NAV: NavItem[] = [
  { href: "/gate", label: "GATE" },
  { href: "/gate/2027", label: "GATE 2027" },
  { href: "/gate/papers", label: "Past papers" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/gate/pricing", label: "Pricing" },
];

export function SiteHeader({ nav = HOME_NAV }: { nav?: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="Lemyte home">
          <Image src="/lemyte-logo.svg" alt="Lemyte" width={1346} height={430} priority unoptimized className="h-6 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <HeaderActions />
        </div>
      </Container>
      <div className="border-t border-zinc-100 md:hidden">
        <Container className="flex gap-1 overflow-x-auto py-2">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600">
              {item.label}
            </Link>
          ))}
        </Container>
      </div>
    </header>
  );
}

const FOOTER = [
  {
    heading: "GATE",
    links: [
      { href: "/gate", label: "Overview" },
      { href: "/gate/2027", label: "GATE 2027 dates & syllabus" },
      { href: "/gate/papers", label: "Past papers & answer keys" },
      { href: "/gate/practice", label: "PYQ tests" },
      { href: "/gate/practice/topics", label: "Topic practice" },
      { href: "/gate/demo", label: "Free test" },
      { href: "/gate/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refund-policy", label: "Refunds" },
      { href: "/shipping-policy", label: "Delivery" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Image src="/lemyte-logo.svg" alt="Lemyte" width={1346} height={430} unoptimized className="h-6 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-500">
            Practice tests for competitive exams. Starting with GATE.
          </p>
        </div>
        {FOOTER.map((col) => (
          <div key={col.heading}>
            <p className="text-sm font-semibold text-ink">{col.heading}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-zinc-500 transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-zinc-100">
        <Container className="flex flex-col gap-2 py-6 text-xs leading-5 text-zinc-400 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {LEGAL.brand} · {LEGAL.company}, Chennai.
          </p>
          <p>Not affiliated with IISc, the IITs or the GATE organising institutes.</p>
        </Container>
      </div>
    </footer>
  );
}
