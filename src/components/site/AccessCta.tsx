// src/components/site/AccessCta.tsx — CTAs that depend on who is looking.
// The free demo is for people deciding whether to buy; students with an active plan get a
// link into the product instead.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase/client";

import { buttonClass, type ButtonStyle } from "./ui";

export type Access = {
  signedIn: boolean;
  hasPlan: boolean;
  name: string | null;
  plan?: { id: string; name: string; endsAt: string | null } | null;
};

// One request per page load, shared by every header/CTA on the page. The site switches pages without a full
// reload, so the shared answer is dropped and fetched again whenever the student signs in or out; otherwise
// the header kept showing "Sign in" after signing in.
let cached: Promise<Access> | null = null;
const listeners = new Set<() => void>();
let watching = false;

function loadAccess(): Promise<Access> {
  cached ??= fetch("/api/gate/me/access", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { signedIn: false, hasPlan: false, name: null }))
    .catch(() => ({ signedIn: false, hasPlan: false, name: null }));
  return cached;
}

function watchAuth() {
  if (watching) return;
  watching = true;
  supabaseBrowser().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      cached = null;
      listeners.forEach((fn) => fn());
    }
  });
}

export function useAccess(): Access | null {
  const [a, setA] = useState<Access | null>(null);
  useEffect(() => {
    let live = true;
    const refresh = () => loadAccess().then((v) => live && setA(v));
    watchAuth();
    listeners.add(refresh);
    refresh();
    return () => {
      live = false;
      listeners.delete(refresh);
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
  const profile = (
    <Link href="/gate/profile" className="hidden min-h-11 items-center px-3 text-sm font-medium text-zinc-600 hover:text-ink sm:inline-flex">
      Profile
    </Link>
  );
  if (access.hasPlan) {
    return (
      <>
        {profile}
        <Link href="/gate/dashboard" className={buttonClass({ size: "sm" })}>
          My dashboard
        </Link>
      </>
    );
  }
  return (
    <>
      {access.signedIn ? (
        <>
          {profile}
          <Link href="/gate/dashboard" className={buttonClass({ variant: "secondary", size: "sm" })}>
            My dashboard
          </Link>
        </>
      ) : (
        <Link href="/gate/auth/sign-in" className="hidden min-h-11 items-center px-3 text-sm font-medium text-zinc-600 hover:text-ink sm:inline-flex">
          Sign in
        </Link>
      )}
      <Link href="/gate/demo" className={buttonClass({ size: "sm" })}>
        Try a free test
      </Link>
    </>
  );
}
