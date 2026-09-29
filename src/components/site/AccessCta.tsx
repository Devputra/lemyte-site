// src/components/site/AccessCta.tsx — CTAs that depend on who is looking.
// The free demo is for people deciding whether to buy; students with an active plan get a
// link into the product instead.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { buttonClass, type ButtonStyle } from "./ui";

export type Access = { signedIn: boolean; hasPlan: boolean; name: string | null };

let cached: Promise<Access> | null = null;
export function loadAccess(): Promise<Access> {
  cached ??= fetch("/api/gate/me/access", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { signedIn: false, hasPlan: false, name: null }))
    .catch(() => ({ signedIn: false, hasPlan: false, name: null }));
  return cached;
}

export function useAccess(): Access | null {
  const [a, setA] = useState<Access | null>(null);
  useEffect(() => {
    let live = true;
    loadAccess().then((v) => live && setA(v));
    return () => {
      live = false;
    };
  }, []);
  return a;
}

/** "Take a free test" for visitors; for students with a plan, `paidLabel` → `paidHref`. */
export function TrialButton({
  label = "Take a free GATE test",
  paidLabel = "Go to your dashboard",
  paidHref = "/gate/dashboard",
  arrow = false,
  ...style
}: ButtonStyle & { label?: string; paidLabel?: string; paidHref?: string; arrow?: boolean }) {
  const access = useAccess();
  const paid = access?.hasPlan;
  return (
    <Link href={paid ? paidHref : "/gate/demo"} className={buttonClass(style)}>
      {paid ? paidLabel : label}
      {arrow && <ArrowRight className="h-4 w-4" />}
    </Link>
  );
}

/** Right side of the site header. */
export function HeaderActions() {
  const access = useAccess();
  if (!access) return <span className="h-9 w-40" aria-hidden />;
  if (access.hasPlan) {
    return (
      <Link href="/gate/dashboard" className={buttonClass({ size: "sm" })}>
        My dashboard
      </Link>
    );
  }
  return (
    <>
      {access.signedIn ? (
        <Link href="/gate/dashboard" className={buttonClass({ variant: "secondary", size: "sm" })}>
          My dashboard
        </Link>
      ) : (
        <Link href="/gate/auth/sign-in" className="hidden px-3 text-sm font-medium text-zinc-600 hover:text-ink sm:inline">
          Sign in
        </Link>
      )}
      <Link href="/gate/demo" className={buttonClass({ size: "sm" })}>
        Try a free test
      </Link>
    </>
  );
}
