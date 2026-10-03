"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Constellation } from "@/components/motion";
import { DotMarkScene } from "@/components/motion/scenes";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email) return setMsg("Please enter your email.");
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("Almost done: check your inbox and confirm your email.");
        setEmail("");
      } else {
        setMsg(data.error || "Something went wrong.");
      }
    } catch {
      setMsg("Couldn't send that. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-5">
      <Constellation className="opacity-60" density={0.00006} />
      <div className="relative w-full max-w-lg">
        <DotMarkScene className="mb-10 w-28 !rounded-2xl !p-4" />
        <p className="text-sm font-medium text-brand">Lemyte</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">This page isn&apos;t ready yet</h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          We&apos;re working on it. Leave your email and we&apos;ll let you know when it&apos;s live. In the meantime, GATE
          assessment is open.
        </p>

        <form onSubmit={handleSubscribe} className="mt-8 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="h-11 flex-1 rounded-[10px] border border-zinc-300 px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-5 text-[15px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Sending…" : <>Notify me <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-zinc-500">{msg}</p>}

        <p className="mt-8 text-sm">
          <a href="/gate" className="font-medium text-brand hover:text-brand-700">Go to GATE assessment →</a>
        </p>
      </div>
    </main>
  );
}
