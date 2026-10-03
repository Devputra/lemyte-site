// src/components/site/MainNav.tsx — header navigation. Lemyte is a platform with one product (GATE) for now, so
// "Products" opens a menu listing the products; every page except the home page also gets a "Home" link.
// The menu opens on hover (mouse), click/tap, or keyboard (Enter/Space, Escape closes).
"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavLink = { href: string; label: string };
export type NavMenu = { label: string; products: Product[] };
export type NavItem = NavLink | NavMenu;
export type Product = { name: string; tagline: string; href: string; links: NavLink[] };

const HOME: NavLink = { href: "/", label: "Home" };
const isMenu = (i: NavItem): i is NavMenu => "products" in i;

function ProductsMenu({ menu }: { menu: NavMenu }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const pathname = usePathname();

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

  // Small close delay so the pointer can travel from the button to the panel.
  const hover = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? 60 : 160);
  };

  return (
    <div ref={box} className="relative" onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium text-zinc-600 transition-colors hover:text-ink aria-expanded:text-ink"
      >
        {menu.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-[22rem] -translate-x-1/2 pt-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]">
            {menu.products.map((p) => (
              <div key={p.name} className="rounded-xl p-3 hover:bg-zinc-50">
                <Link href={p.href} className="block">
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  <span className="mt-0.5 block text-sm text-zinc-500">{p.tagline}</span>
                </Link>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="inline-flex min-h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:border-brand hover:text-brand"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <p className="px-3 pb-2 pt-1 text-xs text-zinc-500">More exams are on the way.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const linkClass = "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-zinc-600 transition-colors hover:text-ink";

/** Desktop navigation. */
export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const all = pathname === "/" ? items : [HOME, ...items];
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {all.map((item) =>
        isMenu(item) ? (
          <ProductsMenu key={item.label} menu={item} />
        ) : (
          <Link key={item.href} href={item.href} className={linkClass} aria-current={pathname === item.href ? "page" : undefined}>
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

/** Phone navigation: one scrollable row; a product menu becomes a link per product. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const all = (pathname === "/" ? items : [HOME, ...items]).flatMap((i) =>
    isMenu(i) ? i.products.map((p) => ({ href: p.href, label: p.name })) : [i],
  );
  return (
    <nav className="flex gap-1 overflow-x-auto py-1" aria-label="Main">
      {all.map((item) => (
        <Link key={item.href} href={item.href} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium text-zinc-600">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
