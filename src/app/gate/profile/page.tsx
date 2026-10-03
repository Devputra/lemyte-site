// src/app/gate/profile/page.tsx — the student's profile: details, plan time, payments, password, sign out.
"use client";

// User-specific page: opt out of prerendering.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { PlanTimeOpen } from "@/components/gate/PlanTime";
import { buttonClass } from "@/components/site/ui";
import { LEGAL } from "@/lib/legal";
import type { PlanPass } from "@/lib/gate/plan-timeline";
import { supabaseBrowser } from "@/lib/supabase/client";

type Profile = {
  name: string;
  email: string | null;
  subject: string | null;
  subjects: { code: string; name: string }[];
  joinedAt: string;
  planPasses: PlanPass[];
  payments: { date: string; planName: string; amountInr: number; status: "Paid" | "Refunded"; reference: string | null }[];
};

const INPUT =
  "mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Status({ msg }: { msg: { text: string; ok?: boolean } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>
      {msg.text}
    </p>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMsg, setDetailsMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/gate/me/profile", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) return router.replace("/gate/auth/sign-in?next=/gate/profile");
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Couldn't load your profile");
        if (!alive) return;
        setProfile(j);
        setName(j.name);
        setSubject(j.subject ?? "");
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "Couldn't load your profile"));
    return () => {
      alive = false;
    };
  }, [router]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsMsg(null);
    try {
      const r = await fetch("/api/gate/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject: subject || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Couldn't save");
      setDetailsMsg({ ok: true, text: "Saved." });
    } catch (err) {
      setDetailsMsg({ text: err instanceof Error ? err.message : "Couldn't save" });
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setPasswordMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      setPasswordMsg({
        text: /reauth|recent/i.test(text)
          ? "For your security, sign out and use “Forgot password?” on the sign-in page to set a new one."
          : text || "Couldn't change your password. Please try again.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    await supabaseBrowser().auth.signOut().catch(() => {});
    // Full reload so the header and every cached "signed in" state reset.
    window.location.assign("/");
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" aria-label="Loading" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Member since {fmt(profile.joinedAt)}</p>
      </div>

      <Section title="Your details">
        <form onSubmit={saveDetails} className="space-y-4">
          <label className="block text-sm font-medium text-ink">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" className={INPUT} />
          </label>
          <div className="text-sm">
            <span className="font-medium text-ink">Email</span>
            <p className="mt-2 break-all rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-700">{profile.email}</p>
            <p className="mt-1 text-xs text-zinc-500">
              To change it, email <a className="underline" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from this address.
            </p>
          </div>
          <label className="block text-sm font-medium text-ink">
            My GATE paper
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT}>
              <option value="">Not chosen</option>
              {profile.subjects.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-zinc-500">Your dashboard opens on this paper.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={savingDetails} className={buttonClass({})}>
              {savingDetails ? "Saving…" : "Save details"}
            </button>
            <Status msg={detailsMsg} />
          </div>
        </form>
      </Section>

      <Section
        title="Plan"
        aside={
          <Link href="/gate/pricing" className="text-sm font-medium text-brand underline underline-offset-2">
            {profile.planPasses.length ? "Add more time" : "See plans"}
          </Link>
        }
      >
        {profile.planPasses.length ? (
          <PlanTimeOpen passes={profile.planPasses} />
        ) : (
          <p className="text-sm text-zinc-600">You don&apos;t have a plan yet. The free demo is open to everyone.</p>
        )}
      </Section>

      <Section title="Payments">
        {profile.payments.length ? (
          <ul className="divide-y divide-zinc-100">
            {profile.payments.map((p, i) => (
              <li key={`${p.reference ?? p.date}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{p.planName}</p>
                  <p className="text-xs text-zinc-500">
                    {fmt(p.date)}
                    {p.reference && <> · Ref <span className="font-mono">{p.reference}</span></>}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-ink">
                  ₹{p.amountInr.toLocaleString("en-IN")}{" "}
                  <span className={`ml-1 text-xs ${p.status === "Refunded" ? "text-zinc-500" : "text-emerald-700"}`}>{p.status}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">No payments yet.</p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Questions about a payment? Email {LEGAL.email} with the reference. See the{" "}
          <Link href="/refund-policy" className="underline">refund policy</Link>.
        </p>
      </Section>

      <Section title="Password">
        <form onSubmit={savePassword} className="space-y-4">
          <label className="block text-sm font-medium text-ink">
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className={INPUT}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={savingPassword} className={buttonClass({ variant: "secondary" })}>
              {savingPassword ? "Saving…" : "Change password"}
            </button>
            <Status msg={passwordMsg} />
          </div>
        </form>
      </Section>

      <Section title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">Signed in as {profile.email}</p>
          <button onClick={signOut} disabled={signingOut} className={buttonClass({ variant: "secondary" })}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        <p className="mt-4 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
          To delete your account and your data, email{" "}
          <a className="underline" href={`mailto:${LEGAL.email}?subject=${encodeURIComponent("Delete my Lemyte account")}`}>{LEGAL.email}</a>{" "}
          from this address.
        </p>
      </Section>
    </main>
  );
}
