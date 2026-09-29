"use client";

// User-specific page: opt out of prerendering (uses useSearchParams).
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

function safeNext(value: string | null): string {
  if (!value) return "/gate/dashboard";

  // prevent open redirect
  if (!value.startsWith("/")) return "/gate/dashboard";
  if (value.startsWith("//")) return "/gate/dashboard";

  // keep GATE users inside GATE area after auth
  if (!value.startsWith("/gate")) return "/gate/dashboard";

  return value;
}

export default function GateStudentSignInPage() {
  const router = useRouter();

  // Derived from the URL without useSearchParams, which forces a CSR
  // bailout and breaks prerendering.
  const [next, setNext] = useState("/gate/dashboard");
  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    try {
      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "We couldn't sign you in. Please check your email and password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-white text-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-5 py-14 sm:px-6 sm:py-20">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <section className="hidden lg:block">
            <Link
              href="/gate"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to GATE
            </Link>

            <div className="mt-10">
              <p className="text-sm font-medium text-brand">Lemyte · GATE</p>

              <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-tight tracking-[-0.03em] text-ink">
                Welcome back.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-700">
                Pick up where you left off. Your tests, reports and progress
                tracker are saved to your account.
              </p>


            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <Link
              href="/gate"
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to GATE
            </Link>

            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Use the email and password you signed up with.</p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={signIn}>
              <div>
                <label className="text-sm font-bold">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {msg ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {msg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-neutral-600">
              New to Lemyte?{" "}
              <Link
                href={`/gate/auth/sign-up?next=${encodeURIComponent(next)}`}
                className="font-bold text-brand underline underline-offset-4"
              >
                Create an account
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}