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
  if (!value.startsWith("/")) return "/gate/dashboard";
  if (value.startsWith("//")) return "/gate/dashboard";
  if (!value.startsWith("/gate")) return "/gate/dashboard";
  return value;
}

export default function GateStudentSignUpPage() {
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
  const [success, setSuccess] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setSuccess(false);

    try {
      const supabase = supabaseBrowser();

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        window.location.origin;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${baseUrl.replace(
            /\/$/,
            ""
          )}/gate/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      // If email confirmation is enabled, session will be null.
      if (!data.session) {
        setSuccess(true);
        setMsg("Almost done. We've sent a confirmation link to your email. Open it, then sign in.");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "We couldn't create your account. Please try again.");
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
                Create your free account.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-700">
                An account keeps your tests, reports and progress in one place.
                It&apos;s free to create; you only pay if you choose a plan.
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
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Create an account</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">We&apos;ll send you an email to confirm your address.</p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={signUp}>
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {msg ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
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
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              <p className="text-center text-xs leading-5 text-neutral-500">
                By creating an account you agree to our{" "}
                <Link href="/terms" className="font-semibold underline underline-offset-2">Terms</Link> and{" "}
                <Link href="/privacy" className="font-semibold underline underline-offset-2">Privacy Policy</Link>.
              </p>
            </form>

            <div className="mt-5 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link
                href={`/gate/auth/sign-in?next=${encodeURIComponent(next)}`}
                className="font-bold text-brand underline underline-offset-4"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-xs leading-5 text-neutral-600">
              This is not the corporate employer console. This account is for
              GATE aspirants using Lemyte practice products.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}