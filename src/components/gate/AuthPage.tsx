// src/components/gate/AuthPage.tsx — the GATE sign-in and sign-up pages (one form, two modes).
"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Constellation, Reveal } from "@/components/motion";
import { AnswerSheetScene, TopicRingScene } from "@/components/motion/scenes";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/site";

const HOME = "/gate/dashboard";

/** Only same-site paths inside /gate (blocks open redirects like //evil.com). */
function safeNext(value: string | null): string {
  return value && value.startsWith("/gate") && !value.startsWith("//") ? value : HOME;
}

const COPY = {
  "sign-in": {
    title: "Welcome back.",
    lead: "Pick up where you left off. Your tests, reports and progress tracker are saved to your account.",
    heading: "Sign in",
    sub: "Use the email and password you signed up with.",
    button: "Sign in",
    busy: "Signing in…",
    switchText: "New to Lemyte?",
    switchLabel: "Create an account",
    switchTo: "sign-up",
    fail: "We couldn't sign you in. Please check your email and password.",
  },
  "sign-up": {
    title: "Create your free account.",
    lead: "An account keeps your tests, reports and progress in one place. It's free to create; you only pay if you choose a plan.",
    heading: "Create an account",
    sub: "We'll send you an email to confirm your address.",
    button: "Create account",
    busy: "Creating account…",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchTo: "sign-in",
    fail: "We couldn't create your account. Please try again.",
  },
} as const;

const INPUT =
  "mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function AuthPage({ mode }: { mode: keyof typeof COPY }) {
  const c = COPY[mode];
  const router = useRouter();
  const [next, setNext] = useState(HOME);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recover, setRecover] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  // Read ?next= without useSearchParams (which would force a client-side rendering bailout).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(safeNext(params.get("next")));
    setRecover(mode === "sign-in" && params.get("recover") === "1");
  }, [mode]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (!confirmationEmail || cooldown || busy) return;
    setBusy(true);
    setCooldown(60);
    try {
      await supabaseBrowser().auth.resend({
        type: "signup", email: confirmationEmail,
        options: { emailRedirectTo: `${SITE_URL}/gate/auth/callback?next=${encodeURIComponent(next)}` },
      });
    } finally {
      setMsg({ ok: true, text: "If an account exists for that email, we've sent a link." });
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const auth = supabaseBrowser().auth;
      const creds = { email: email.trim().toLowerCase(), password };
      if (recover) {
        const destination = `/gate/auth/reset-password?next=${encodeURIComponent(next)}`;
        try {
          await auth.resetPasswordForEmail(creds.email, {
            redirectTo: `${SITE_URL}/gate/auth/callback?next=${encodeURIComponent(destination)}`,
          });
        } finally {
          setMsg({ ok: true, text: "If an account exists for that email, we've sent a link." });
        }
        return;
      }
      if (mode === "sign-in") {
        const { error } = await auth.signInWithPassword(creds);
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) setConfirmationEmail(creds.email);
          return setMsg({ text: error.message });
        }
      } else {
        const base = SITE_URL;
        const { data, error } = await auth.signUp({
          ...creds,
          options: { emailRedirectTo: `${base}/gate/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) return setMsg({ text: error.message });
        // With email confirmation on, there is no session until the link is opened.
        if (!data.session) {
          setConfirmationEmail(creds.email);
          setCooldown(60);
          return setMsg({ ok: true, text: "Almost done. We've sent a confirmation link to your email. Open it, then sign in." });
        }
      }
      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      if (!recover) setMsg({ text: err instanceof Error ? err.message : c.fail });
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link href="/gate" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
      <ArrowLeft className="h-4 w-4" /> Back to GATE
    </Link>
  );

  return (
    <main className="relative overflow-hidden bg-white text-ink">
      <Constellation className="opacity-50 [mask-image:radial-gradient(ellipse_at_25%_45%,#000_25%,transparent_70%)]" density={0.00007} />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:block">
          {back}
          <p className="mt-10 text-sm font-medium text-brand">Lemyte · GATE</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-tight tracking-[-0.03em]">{c.title}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-700">{c.lead}</p>
          <Reveal delay={0.2} className="mt-10">
            {mode === "sign-in" ? <TopicRingScene className="!mx-0 max-w-[280px]" /> : <AnswerSheetScene className="max-w-md" />}
          </Reveal>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/95 p-6 shadow-xl shadow-brand/5 backdrop-blur sm:p-8">
          <div className="mb-6 lg:hidden">{back}</div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">{recover ? "Reset your password" : c.heading}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{recover ? "Enter your email to get a password reset link." : c.sub}</p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-bold">
              Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" className={INPUT} />
            </label>
            {!recover && <label className="block text-sm font-bold">
              Password
              <input
                type="password"
                required
                minLength={mode === "sign-up" ? 6 : undefined}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "sign-up" ? "Minimum 6 characters" : "Enter password"}
                className={INPUT}
              />
            </label>}
            {mode === "sign-in" && (
              <button type="button" className="min-h-11 text-sm text-brand underline" onClick={() => { setRecover(!recover); setMsg(null); }}>
                {recover ? "Back to sign in" : "Forgot password?"}
              </button>
            )}

            {msg && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? (recover ? "Sending…" : c.busy) : recover ? "Send reset link" : c.button}
            </button>

            {confirmationEmail && !recover && (
              <button type="button" disabled={busy || cooldown > 0} onClick={() => void resend().catch(() => {})} className="min-h-11 text-sm text-brand underline disabled:text-neutral-500">
                Resend confirmation email{cooldown > 0 ? ` (${cooldown}s)` : ""}
              </button>
            )}

            {mode === "sign-up" && (
              <p className="text-center text-xs leading-5 text-neutral-500">
                By creating an account you agree to our{" "}
                <Link href="/terms" className="font-semibold underline underline-offset-2">Terms</Link> and{" "}
                <Link href="/privacy" className="font-semibold underline underline-offset-2">Privacy Policy</Link>.
              </p>
            )}
          </form>

          <p className="mt-5 text-center text-sm text-neutral-600">
            {c.switchText}{" "}
            <Link href={`/gate/auth/${c.switchTo}?next=${encodeURIComponent(next)}`} className="font-bold text-brand underline underline-offset-4">
              {c.switchLabel}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
