// src/components/site/SiteChrome.tsx — shared header and footer for every public page.
import Image from "next/image";
import Link from "next/link";

import { LEGAL } from "@/lib/legal";

import { HeaderActions } from "./AccessCta";
import { FooterLink, MainNav, MobileNav, type NavItem as MenuItem, type NavLink } from "./MainNav";
import { Container } from "./ui";

export type NavItem = MenuItem;

// Lemyte is an assessment platform; GATE is the first product. Add new exams to the Products menu.
const PLATFORM_NAV: NavItem[] = [
  { label: "Products", items: [{ href: "/gate", label: "GATE", match: "prefix" }] },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

// Inside the GATE product. Tests groups every way of taking a test; PYQs is reading papers and answer keys.
export const GATE_NAV: NavItem[] = [
  { href: "/gate", label: "Overview" },
  { href: "/gate/2027", label: "GATE 2027" },
  // Subject pages (/gate/ee …) list a subject's PYQs, so they count as the PYQs section.
  { href: "/gate/papers", label: "PYQs", match: "prefix", also: "^/gate/(ae|ce|cs|da|ec|ee|me)$" },
  {
    label: "Tests",
    items: [
      { href: "/gate/practice", label: "Full papers", note: "Complete PYQ papers, 3 hours" },
      { href: "/gate/practice/topics", label: "Topic practice", note: "5 to 30 questions from one topic" },
      { href: "/gate/ranked", label: "Ranked tests", note: "One counted attempt, ranked" },
      { href: "/gate/demo", label: "Free demo", note: "10 questions, no card needed", visitorsOnly: true },
    ],
  },
  { href: "/gate/pricing", label: "Pricing" },
];

export function SiteHeader({ nav = PLATFORM_NAV }: { nav?: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="Lemyte home">
          <Image src="/lemyte-logo.svg" alt="Lemyte" width={1346} height={430} priority unoptimized className="h-6 w-auto" />
        </Link>
        <MainNav items={nav} />
        <div className="flex shrink-0 items-center gap-2">
          <HeaderActions />
        </div>
      </Container>
      <div className="border-t border-zinc-100 md:hidden">
        <Container>
          <MobileNav items={nav} />
        </Container>
      </div>
    </header>
  );
}

const FOOTER: { heading: string; links: NavLink[] }[] = [
  {
    heading: "GATE",
    links: [
      { href: "/gate", label: "Overview" },
      { href: "/gate/2027", label: "GATE 2027 dates & syllabus" },
      { href: "/gate/papers", label: "PYQs & answer keys", match: "prefix", also: "^/gate/(ae|ce|cs|da|ec|ee|me)$" },
      { href: "/gate/practice", label: "Full PYQ tests" },
      { href: "/gate/practice/topics", label: "Topic practice" },
      { href: "/gate/ranked", label: "Ranked tests" },
      { href: "/gate/demo", label: "Free test", visitorsOnly: true },
      { href: "/gate/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
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
                <FooterLink key={l.href} link={l} />
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-zinc-100">
        <Container className="flex flex-col gap-2 py-6 text-xs leading-5 text-zinc-500 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {LEGAL.brand} · {LEGAL.company}, Chennai.
          </p>
          <p>Not affiliated with IISc, the IITs or the GATE organising institutes.</p>
        </Container>
      </div>
    </footer>
  );
}
