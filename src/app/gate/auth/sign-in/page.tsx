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
    } catch (err: any) {
      setMsg(err?.message ?? "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <section className="hidden lg:block">
            <Link
              href="/gate"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#193bc8]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to GATE
            </Link>

            <div className="mt-10">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#193bc8]">
                Lemyte GATE
              </p>

              <h1 className="mt-4 max-w-2xl text-5xl font-black leading-tight tracking-[-0.04em]">
                Sign in to continue your GATE preparation.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-700">
                Access your mocks, PYQ practice, reports, dashboard, and paid
                practice plan from one student account.
              </p>

              <div className="mt-8 grid max-w-xl gap-3 text-sm text-neutral-700">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <span className="font-bold text-black">No employer flow.</span>{" "}
                  This account is for GATE aspirants only.
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <span className="font-bold text-black">Your reports stay linked.</span>{" "}
                  Every submitted attempt is tied to your student dashboard.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <Link
              href="/gate"
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#193bc8] lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to GATE
            </Link>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#193bc8]">
                Student Sign In
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                Continue GATE practice
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Sign in to access your dashboard, practice tests, ranked mocks,
                and reports.
              </p>
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
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#193bc8] focus:ring-2 focus:ring-[#193bc8]/20"
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
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#193bc8] focus:ring-2 focus:ring-[#193bc8]/20"
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
                className="flex w-full items-center justify-center rounded-xl bg-[#193bc8] px-5 py-3 text-sm font-black text-white transition hover:bg-[#102a9a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-neutral-600">
              New to Lemyte GATE?{" "}
              <Link
                href={`/gate/auth/sign-up?next=${encodeURIComponent(next)}`}
                className="font-bold text-[#193bc8] underline underline-offset-4"
              >
                Create student account
              </Link>
            </div>

            <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-xs leading-5 text-neutral-600">
              This is for GATE aspirants. Employer and employee assessment flows
              are separate from the GATE product.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}