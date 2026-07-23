// src/app/gate/pricing/page.tsx
"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";

interface Plan {
  id: string;
  code: string;
  name: string;
  durationMonths: number;
  priceInr: number;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const FEATURE_LISTS: Record<number, string[]> = {
  1: [
    "Full GATE CS practice access during validity",
    "Practice and ranked mock catalogs",
    "Attempt reports with question review",
    "Topic-wise PYQ practice",
    "Best for final revision sprint",
  ],
  3: [
    "Everything in 1 Month",
    "Better value for serious preparation",
    "Enough runway for multiple mock cycles",
    "Topic-wise correction loop",
    "Recommended for most aspirants",
  ],
  6: [
    "Everything in 3 Months",
    "Longer improvement tracking",
    "Ideal for full preparation cycle",
    "More room for ranked mock benchmarking",
    "Strong value for committed aspirants",
  ],
  12: [
    "Everything in 6 Months",
    "Longest access window",
    "Useful for repeaters and multi-exam practice",
    "Maximum continuity across test cycles",
    "Best for long runway preparation",
  ],
};

function getPlanPositioning(months: number): string {
  if (months === 1) return "Final revision sprint";
  if (months === 3) return "Serious test practice";
  if (months === 6) return "Full preparation cycle";
  if (months === 12) return "Long runway preparation";
  return `${months}-month access`;
}

function getBadge(months: number): string | null {
  if (months === 3) return "Recommended";
  if (months === 6) return "Best Value";
  if (months === 12) return "Longest Access";
  return null;
}

function cardClass(months: number): string {
  if (months === 3) return "border-[#193bc8] ring-2 ring-[#193bc8]/20 shadow-xl shadow-[#193bc8]/10";
  if (months === 6) return "border-zinc-950 ring-2 ring-zinc-950/10 shadow-xl";
  return "border-zinc-200 shadow-sm";
}

export default function GatePricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/plans", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setPlans(j.plans ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load plans");
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.durationMonths - b.durationMonths),
    [plans]
  );

  async function startCheckout(plan: Plan) {
    setError(null);
    setBusyPlanId(plan.id);
    try {
      const res = await fetch("/api/gate/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (res.status === 401) {
        router.push("/gate/auth/sign-in?next=/gate/pricing");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Checkout failed (${res.status})`);
      }

      if (!window.Razorpay) {
        throw new Error("Payment SDK not loaded yet. Please retry in a second.");
      }
      if (!data.keyId) {
        throw new Error("Razorpay key not configured.");
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amountPaise,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: "Lemyte GATE",
        description: data.plan?.name ?? plan.name,
        prefill: data.user?.email ? { email: data.user.email } : undefined,
        notes: { payment_order_id: data.paymentOrderId },
        theme: { color: "#193bc8" },
        handler: async (response: any) => {
          try {
            const verify = await fetch("/api/gate/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentOrderId: data.paymentOrderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const vjson = await verify.json().catch(() => ({}));
            if (!verify.ok) {
              throw new Error(vjson.error ?? "Verification failed");
            }
            router.push("/gate/dashboard?welcome=1");
          } catch (e: any) {
            setError(e?.message ?? "Verification failed");
            setBusyPlanId(null);
          }
        },
        modal: {
          ondismiss: () => setBusyPlanId(null),
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        setError(resp?.error?.description ?? "Payment failed");
        setBusyPlanId(null);
      });

      rzp.open();
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed");
      setBusyPlanId(null);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="bg-white">
        <section className="border-b border-zinc-200 bg-zinc-50 px-4 py-16">
          <div className="mx-auto max-w-7xl text-center">
            <div className="inline-flex rounded-full border border-[#193bc8]/20 bg-[#193bc8]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">
              One-time access plans
            </div>
            <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              Start free. Buy access when you are ready to train seriously.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600">
              Choose a plan based on your preparation runway. No auto-renewal language, no hidden subscription trap. Pay once, use during validity.
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/gate/demo" className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-5 py-3 text-sm font-black text-zinc-950 hover:border-zinc-950">
                Try demo first <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          {error ? (
            <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            <div className="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-3 inline-flex self-start rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-700">Free</div>
              <h2 className="text-xl font-black text-zinc-950">Diagnostic Demo</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-500">Interface check</p>
              <div className="mt-5 text-4xl font-black">₹0</div>
              <p className="mt-4 min-h-[72px] text-sm leading-6 text-zinc-600">Best for first-time users who want to verify product quality before paying.</p>
              <ul className="mt-6 flex-1 space-y-3">
                {["10-question mini mock", "Guest access", "Timer + palette + calculator", "Report after submit", "1 attempt per 24 hours"].map((f) => (
                  <li key={f} className="flex gap-2 text-sm font-semibold text-zinc-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#193bc8]" /> {f}</li>
                ))}
              </ul>
              <Link href="/gate/demo" className="mt-6 rounded-xl border border-zinc-300 px-4 py-3 text-center text-sm font-black text-zinc-950 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white">Start Demo</Link>
            </div>

            {loadingPlans ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500 xl:col-span-4">Loading plans…</div>
            ) : sortedPlans.length === 0 ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center text-sm font-semibold text-amber-800 xl:col-span-4">No plans are configured yet. Seed gate.plans to enable pricing.</div>
            ) : (
              sortedPlans.map((plan) => {
                const badge = getBadge(plan.durationMonths);
                const features = FEATURE_LISTS[plan.durationMonths] ?? ["Full access during plan validity", "Practice tests", "Ranked tests", "Reports", "Topic-wise PYQ practice"];
                return (
                  <div key={plan.id} className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 ${cardClass(plan.durationMonths)}`}>
                    {badge ? <div className="mb-3 inline-flex self-start rounded-full bg-[#193bc8] px-2.5 py-1 text-xs font-black text-white">{badge}</div> : <div className="mb-3 h-6" />}
                    <h2 className="text-xl font-black text-zinc-950">{plan.name}</h2>
                    <p className="mt-2 text-sm font-semibold text-zinc-500">{getPlanPositioning(plan.durationMonths)}</p>
                    <div className="mt-5">
                      <span className="text-4xl font-black tracking-tight">₹{plan.priceInr.toLocaleString("en-IN")}</span>
                      <span className="ml-1 text-sm font-semibold text-zinc-500">/{plan.durationMonths === 1 ? "month" : `${plan.durationMonths} months`}</span>
                    </div>
                    <p className="mt-4 min-h-[72px] text-sm leading-6 text-zinc-600">
                      {plan.durationMonths === 1
                        ? "Short runway. Use it when your exam is close or you want to validate the full product."
                        : plan.durationMonths === 3
                        ? "The cleanest choice for most serious aspirants running multiple correction cycles."
                        : plan.durationMonths === 6
                        ? "Enough time to build, measure, and rebuild weak areas without panic."
                        : "Long runway for repeaters or students preparing across multiple exams."}
                    </p>
                    <ul className="mt-6 flex-1 space-y-3">
                      {features.map((f) => (
                        <li key={f} className="flex gap-2 text-sm font-semibold text-zinc-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#193bc8]" /> {f}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => startCheckout(plan)}
                      disabled={busyPlanId === plan.id}
                      className="mt-6 rounded-xl bg-[#193bc8] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#102b9f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyPlanId === plan.id ? "Opening Checkout…" : "Buy Access"}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-10 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <ShieldCheck className="h-7 w-7 shrink-0 text-[#193bc8]" />
              <div>
                <h2 className="font-black text-zinc-950">Payment and access note</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Payments are processed through Razorpay. After successful verification, access is granted to your account for the plan validity. Keep the language clean: this is access purchase, not a manipulative subscription funnel.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
