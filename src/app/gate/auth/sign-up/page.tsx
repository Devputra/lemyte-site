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
        setMsg("Check your inbox to confirm your email. Then sign in to continue.");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message ?? "Unable to create account. Please try again.");
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
                Create a student account for serious GATE practice.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-700">
                Keep your mock attempts, reports, topic practice, and payment
                access connected to one GATE student profile.
              </p>
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
                Student Account
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                Start your GATE preparation
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Create an account to access paid practice, dashboards, and saved
                reports.
              </p>
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
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#193bc8] focus:ring-2 focus:ring-[#193bc8]/20"
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
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#193bc8] focus:ring-2 focus:ring-[#193bc8]/20"
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
                className="flex w-full items-center justify-center rounded-xl bg-[#193bc8] px-5 py-3 text-sm font-black text-white transition hover:bg-[#102a9a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Student Account"
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link
                href={`/gate/auth/sign-in?next=${encodeURIComponent(next)}`}
                className="font-bold text-[#193bc8] underline underline-offset-4"
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