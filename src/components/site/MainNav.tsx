// src/components/site/MainNav.tsx — header navigation (desktop + phone) and the "you are here" logic shared with
// the footer.
//
// - Items are links or dropdowns (Products, Tests). Dropdowns open on hover (mouse), click/tap or keyboard;
//   Escape or a click outside closes them.
// - The current page is marked (dark, bold, blue underline in the header; aria-current="page"). A dropdown is
//   marked when one of its items is the current page.
// - Every page except the home page gets "Home" first. Items flagged `visitorsOnly` (the free demo) are hidden
//   from students with a plan.
"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAccess } from "./AccessCta";

export type NavLink = {
  href: string;
  label: string;
  note?: string; // one short line under the label, in dropdowns
  match?: "exact" | "prefix"; // prefix: also current on sub-pages (default exact)
  also?: string; // regex source for other paths where this link counts as current (strings survive the server/client boundary)
  visitorsOnly?: boolean; // hide for students with a plan
};
export type NavMenu = { label: string; items: NavLink[] };
export type NavItem = NavLink | NavMenu;

const HOME: NavLink = { href: "/", label: "Home" };
export const isMenu = (i: NavItem): i is NavMenu => "items" in i;

/** Is this link the page we are on? */
export function isCurrent(link: Pick<NavLink, "href" | "match" | "also">, pathname: string) {
  const href = link.href.split("#")[0] || "/";
  if (link.also && new RegExp(link.also).test(pathname)) return true;
  return link.match === "prefix" ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
}

function useVisible(items: NavItem[]) {
  const access = useAccess();
  const keep = (l: NavLink) => !(l.visitorsOnly && access?.hasPlan);
  return items
    .map((i) => (isMenu(i) ? { ...i, items: i.items.filter(keep) } : i))
    .filter((i) => (isMenu(i) ? i.items.length > 0 : keep(i)));
}

const base = "relative inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm transition-colors";
const tone = (on: boolean) => (on ? "font-semibold text-ink" : "font-medium text-zinc-600 hover:text-ink");
const Bar = () => <span aria-hidden className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-brand" />;

function Dropdown({ menu, pathname }: { menu: NavMenu; pathname: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const active = menu.items.some((l) => isCurrent(l, pathname));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A short close delay lets the pointer travel from the button into the list.
  const hover = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? 60 : 160);
  };

  return (
    <div ref={box} className="relative" onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} className={`${base} ${tone(active || open)}`}>
        {menu.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
        {active && <Bar />}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 w-max min-w-52 max-w-xs pt-1">
          <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.3)]">
            {menu.items.map((l) => {
              const on = isCurrent(l, pathname);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-11 flex-col justify-center border-l-2 px-4 py-2 text-sm transition-colors hover:bg-brand-50 ${
                      on ? "border-brand bg-brand-50/60 font-semibold text-brand" : "border-transparent font-medium text-zinc-700 hover:text-brand"
                    }`}
                  >
                    {l.label}
                    {l.note && <span className="mt-0.5 text-xs font-normal text-zinc-500">{l.note}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Desktop navigation. */
export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const visible = useVisible(pathname === "/" ? items : [HOME, ...items]);
  return (
    <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
      {visible.map((item) => {
        if (isMenu(item)) return <Dropdown key={item.label} menu={item} pathname={pathname} />;
        const on = isCurrent(item, pathname);
        return (
          <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} className={`${base} ${tone(on)}`}>
            {item.label}
            {on && <Bar />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone navigation: one scrollable row; dropdowns are flattened and the current page is scrolled into view. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const visible = useVisible(pathname === "/" ? items : [HOME, ...items]);
  const links = visible.flatMap((i) => (isMenu(i) ? i.items : [i]));
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    row.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  return (
    <nav ref={row} className="flex gap-1 overflow-x-auto py-1" aria-label="Main">
      {links.map((l) => {
        const on = isCurrent(l, pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm ${on ? "bg-brand-50 font-semibold text-brand" : "font-medium text-zinc-600"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Footer link that shows the current page and respects `visitorsOnly`. */
export function FooterLink({ link }: { link: NavLink }) {
  const pathname = usePathname() ?? "/";
  const access = useAccess();
  if (link.visitorsOnly && access?.hasPlan) return null;
  const on = isCurrent(link, pathname);
  return (
    <li>
      <Link
        href={link.href}
        aria-current={on ? "page" : undefined}
        className={`text-sm transition-colors ${on ? "font-semibold text-ink" : "text-zinc-500 hover:text-ink"}`}
      >
        {link.label}
      </Link>
    </li>
  );
}
