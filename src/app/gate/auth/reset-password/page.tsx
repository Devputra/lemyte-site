"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [next, setNext] = useState("/gate/dashboard");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("next");
    if (value === "/gate" || value?.startsWith("/gate/")) setNext(value);
    void supabaseBrowser().auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
    }).catch(() => setSignedIn(false)).finally(() => setReady(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch {
      setError("Couldn't update your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      {!ready ? <p className="mt-4">Checking your link…</p> : !signedIn ? (
        <div className="mt-4 space-y-4 text-sm">
          <p>This link has expired or is no longer valid. Request a new link to reset your password.</p>
          <Link className="inline-flex min-h-11 items-center text-brand underline" href={`/gate/auth/sign-in?recover=1&next=${encodeURIComponent(next)}`}>Send a new reset link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">New password
            <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          <p className="text-sm text-zinc-600">Use at least 6 characters.</p>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button disabled={busy} className="min-h-11 rounded-xl bg-brand px-5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving…" : "Save password"}</button>
        </form>
      )}
    </main>
  );
}
