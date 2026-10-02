// src/app/gate/pricing/PricingClient.tsx — the interactive part of /gate/pricing (current plan, checkout).
// Plans arrive from the server page, so prices are in the HTML that search engines and AI crawlers read.
"use client";

import Script from "next/script";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";

import { useAccess } from "@/components/site/AccessCta";
import { safeJson } from "@/lib/fetch-helpers";
import { Constellation, Reveal } from "@/components/motion";
import { LEGAL } from "@/lib/legal";

export interface Plan {
  id: string;
  code: string;
  name: string;
  durationMonths: number;
  priceInr: number;
  endsAt: string | null; // fixed-date plan, e.g. "Until GATE 2027"
}

const DAY = 86_400_000;

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: Record<string, unknown>) => void) => void;
    };
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const included = (subjects: number, papers: number) => [
  `All ${subjects} GATE subjects and all ${papers} official PYQ papers`,
  "Topic practice on any topic, as often as you like",
  "Ranked tests when they are open",
  "A full report after every test, with worked solutions",
  "Your progress tracker, streak and weak-topic list",
];

const FIT: Record<number, string> = {
  1: "Good for a final revision month before the exam.",
  3: "Enough time to work through several papers and fix weak topics.",
  6: "Covers a full preparation cycle, at the lowest monthly price.",
  12: "For a long preparation window or a second attempt.",
};

export function PricingClient({
  initialPlans,
  totals,
}: {
  initialPlans: Plan[];
  totals: { subjects: number; papers: number };
}) {
  const router = useRouter();
  const access = useAccess();
  const current = access?.hasPlan ? (access.plan ?? null) : null;
  const daysLeft = current?.endsAt
    ? Math.max(
        0,
        Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 86400000),
      )
    : null;
  const plans = initialPlans;
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  const sortedPlans = useMemo(
    () => plans.filter((p) => !p.endsAt).sort((a, b) => a.durationMonths - b.durationMonths),
    [plans],
  );
  const examPlans = useMemo(() => plans.filter((p) => p.endsAt), [plans]);

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

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.error ?? `Checkout failed (${res.status})`);
      }

      if (!window.Razorpay) {
        throw new Error(
          "The payment window is still loading. Please try again in a moment.",
        );
      }
      if (!data.keyId) {
        throw new Error(
          "Payments aren't available right now. Please try again later.",
        );
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
        handler: async (response: Record<string, string>) => {
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
            const vjson = await safeJson(verify);
            if (!verify.ok) {
              throw new Error(vjson.error ?? "Verification failed");
            }
            router.push("/gate/dashboard?welcome=1");
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Verification failed");
            setBusyPlanId(null);
          }
        },
        modal: {
          ondismiss: () => setBusyPlanId(null),
        },
      });

      rzp.on("payment.failed", (resp: Record<string, unknown>) => {
        const errObj = resp?.error as Record<string, unknown> | undefined;
        setError((errObj?.description as string) ?? "Payment failed");
        setBusyPlanId(null);
      });

      rzp.open();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusyPlanId(null);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <div className="bg-white">
        <section className="relative overflow-hidden border-b border-zinc-100">
          <Constellation
            className="opacity-60 [mask-image:radial-gradient(ellipse_at_50%_40%,#000_25%,transparent_70%)]"
            density={0.00007}
          />
          <Reveal className="relative mx-auto max-w-6xl px-5 py-12 text-center sm:px-6 sm:py-16">
            {current ? (
              <>
                <p className="text-sm font-medium text-brand">Your plan</p>
                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                  You&apos;re on the {current.name} plan
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
                  Active until{" "}
                  <span className="font-medium text-ink">
                    {fmtDate(current.endsAt)}
                  </span>
                  {daysLeft !== null && (
                    <>
                      {" "}
                      · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                    </>
                  )}
                  . Need more time? Extend below: the extra time starts when
                  your current plan ends, so you don&apos;t lose any days.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/gate/dashboard"
                    className="inline-flex h-11 items-center rounded-[10px] border border-zinc-300 px-5 text-[15px] font-medium text-ink hover:bg-zinc-50"
                  >
                    Go to your dashboard
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-brand">Pricing</p>
                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                  Simple plans, paid once
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
                  Every plan unlocks everything on Lemyte for its duration.
                  Plans don&apos;t renew, and you can get a full refund within{" "}
                  {LEGAL.refundWindowDays} days if you have started no more than{" "}
                  {LEGAL.refundMaxAttempts} tests.
                </p>
              </>
            )}
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
          {error ? (
            <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {examPlans.map((plan) => {
            const end = new Date(plan.endsAt!);
            const from = current?.endsAt && new Date(current.endsAt) > new Date() ? new Date(current.endsAt) : new Date();
            const days = Math.max(0, Math.ceil((end.getTime() - from.getTime()) / DAY));
            const covered = days === 0;
            const perMonth = days ? Math.round(plan.priceInr / (days / 30.44)) : 0;
            return (
              <Reveal
                key={plan.id}
                className="relative mb-8 grid gap-6 overflow-hidden rounded-2xl border border-brand bg-gradient-to-br from-brand-50 via-white to-white p-6 ring-1 ring-brand sm:p-8 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white">For GATE 2027</span>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{plan.name}</h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-600">
                    {covered
                      ? `Your current plan already runs past ${fmtDate(plan.endsAt)}, so you're covered for GATE 2027.`
                      : current
                        ? `Extends your plan to ${fmtDate(plan.endsAt)}: ${days} more days, through the exam and a week after the last paper.`
                        : `Full access until ${fmtDate(plan.endsAt)}: ${days} days from today, through the exam and a week after the last paper. One payment, no renewal.`}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-4xl font-semibold tracking-tight tabular-nums">₹{plan.priceInr.toLocaleString("en-IN")}</p>
                  {!covered && <p className="mt-1 text-sm text-zinc-500">about ₹{perMonth.toLocaleString("en-IN")} a month, paid once</p>}
                  <button
                    onClick={() => startCheckout(plan)}
                    disabled={busyPlanId !== null || covered}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-brand px-6 text-[15px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 md:w-auto"
                  >
                    {busyPlanId === plan.id ? "Opening checkout…" : covered ? "Already covered" : current ? `Extend to ${fmtDate(plan.endsAt)}` : "Buy until GATE 2027"}
                  </button>
                </div>
              </Reveal>
            );
          })}

          <div
            className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${access?.hasPlan ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
          >
            {!access?.hasPlan && (
              <Reveal className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5">
                <h2 className="text-lg font-semibold text-ink">Free demo</h2>
                <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">
                  ₹0
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  No account or card needed
                </p>
                <p className="mt-5 flex-1 text-sm leading-6 text-zinc-600">
                  A 10-question General Aptitude test to try the exam screen and
                  see a real report.
                </p>
                <Link
                  href="/gate/demo"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] border border-zinc-300 text-[15px] font-medium text-ink hover:bg-zinc-50"
                >
                  Take the demo
                </Link>
              </Reveal>
            )}

            {sortedPlans.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500 lg:col-span-3">
                Plans aren&apos;t available right now. Please try again later.
              </div>
            ) : (
              sortedPlans.map((plan, i) => {
                const perMonth = Math.round(
                  plan.priceInr / plan.durationMonths,
                );
                const isCurrent = current?.id === plan.id;
                const best =
                  sortedPlans.length > 1 &&
                  perMonth ===
                    Math.min(
                      ...sortedPlans.map((p) =>
                        Math.round(p.priceInr / p.durationMonths),
                      ),
                    );
                return (
                  <Reveal
                    key={plan.id}
                    delay={0.08 * (i + 1)}
                    className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10 ${best ? "border-brand ring-1 ring-brand" : "border-zinc-200"}`}
                  >
                    {isCurrent ? (
                      <span className="absolute -top-3 left-6 rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">
                        Current plan
                      </span>
                    ) : (
                      best && (
                        <span className="absolute -top-3 left-6 rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white">
                          Best value
                        </span>
                      )
                    )}
                    <h2 className="text-lg font-semibold text-ink">
                      {plan.name}
                    </h2>
                    <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">
                      ₹{plan.priceInr.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {plan.durationMonths === 1
                        ? "One-time payment"
                        : `₹${perMonth.toLocaleString("en-IN")} a month, paid once`}
                    </p>
                    <p className="mt-5 flex-1 text-sm leading-6 text-zinc-600">
                      {current
                        ? `Adds ${plan.name.toLowerCase()} after ${fmtDate(current.endsAt)}.`
                        : (FIT[plan.durationMonths] ??
                          `${plan.durationMonths} months of full access.`)}
                    </p>
                    <button
                      onClick={() => startCheckout(plan)}
                      disabled={busyPlanId !== null}
                      className={`mt-6 inline-flex h-11 items-center justify-center rounded-[10px] text-[15px] font-medium transition-colors disabled:opacity-60 ${best ? "bg-brand text-white hover:bg-brand-700" : "bg-ink text-white hover:bg-zinc-800"}`}
                    >
                      {busyPlanId === plan.id
                        ? "Opening checkout…"
                        : current
                          ? `Extend by ${plan.name.toLowerCase()}`
                          : `Buy ${plan.name.toLowerCase()}`}
                    </button>
                  </Reveal>
                );
              })
            )}
          </div>

          <div className="mt-12 grid gap-8 rounded-2xl border border-zinc-200 p-6 sm:p-8 lg:grid-cols-2">
            <div>
              <h2 className="font-semibold text-ink">Every plan includes</h2>
              <ul className="mt-4 space-y-3">
                {included(totals.subjects, totals.papers).map((f) => (
                  <li key={f} className="flex gap-3 text-[15px] text-zinc-600">
                    <Check
                      className="mt-0.5 h-5 w-5 shrink-0 text-brand"
                      strokeWidth={2}
                    />{" "}
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:border-l lg:border-zinc-200 lg:pl-8">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="h-5 w-5 text-brand"
                  strokeWidth={1.75}
                />
                <h2 className="font-semibold text-ink">Payments and refunds</h2>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
                Payments are handled by Razorpay (UPI, cards, net banking and
                wallets). Your plan starts as soon as the payment is confirmed,
                usually within a minute. If a plan isn&apos;t right for you, ask
                for a refund within {LEGAL.refundWindowDays} days, as long as you have
                started no more than {LEGAL.refundMaxAttempts} tests.
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                By buying a plan you agree to our{" "}
                <Link
                  href="/terms"
                  className="font-medium text-brand hover:text-brand-700"
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/refund-policy"
                  className="font-medium text-brand hover:text-brand-700"
                >
                  Refund Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
