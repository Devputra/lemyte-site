// src/app/gate/demo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GateDemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gate/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DEMO" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Failed to start demo (${res.status})`);
      }

      router.push(`/gate/attempt/${data.attemptId}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to start demo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold">Free GATE Demo</h1>
      <p className="mt-3 text-gray-600">
        Experience the exam simulator with 10 questions. No sign-up required.
      </p>

      <div className="mt-8 rounded-xl border bg-gray-50 p-6">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <div className="text-2xl font-bold text-gray-900">10</div>
            <div>Questions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">~30 min</div>
            <div>Duration</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">MCQ + NAT</div>
            <div>Types</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">24h</div>
            <div>Cooldown</div>
          </div>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-left text-sm text-gray-500">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-block h-4 w-4 rounded-full bg-[#00A86B] text-center text-[10px] leading-4 text-white">&#10003;</span>
          Full palette, timer, and calculator experience
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-block h-4 w-4 rounded-full bg-[#00A86B] text-center text-[10px] leading-4 text-white">&#10003;</span>
          Guest access — no account needed
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-block h-4 w-4 rounded-full bg-[#00A86B] text-center text-[10px] leading-4 text-white">&#10003;</span>
          Results auto-delete after 24 hours
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-block h-4 w-4 rounded-full bg-[#00A86B] text-center text-[10px] leading-4 text-white">&#10003;</span>
          Rate limit: 1 demo per 24h per device
        </li>
      </ul>

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={startDemo}
        disabled={loading}
        className="mt-8 w-full rounded-lg bg-[#00A86B] px-6 py-3.5 text-lg font-bold text-white hover:bg-[#009060] disabled:opacity-50 transition-colors"
      >
        {loading ? "Starting Demo…" : "Start Demo Now"}
      </button>

      <p className="mt-6 text-xs text-gray-400">
        Want unlimited full-length mocks?{" "}
        <a href="/gate/pricing" className="underline">
          View plans
        </a>
      </p>
    </div>
  );
}
