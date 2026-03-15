// src/app/gate/pricing/page.tsx
"use client";

import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Demo",
    price: "Free",
    period: "",
    cta: "Start Demo",
    href: "/gate/demo",
    highlight: false,
    features: [
      "10-question mini mock",
      "Guest access (no sign-up)",
      "Palette + timer + calculator",
      "1 attempt per 24 hours",
      "Results auto-delete after 24h",
    ],
  },
  {
    name: "Monthly",
    price: "₹499",
    period: "/month",
    cta: "Subscribe",
    href: "#",
    highlight: true,
    features: [
      "Unlimited full-length mocks (65Q)",
      "Ranked + Practice modes",
      "Detailed analytics & solutions",
      "Subject/topic breakdown",
      "Percentile ranking",
      "Errata-protected scores",
      "Priority support",
    ],
  },
  {
    name: "Quarterly",
    price: "₹1,199",
    period: "/3 months",
    cta: "Subscribe",
    href: "#",
    highlight: false,
    features: [
      "Everything in Monthly",
      "Save 20% vs monthly",
      "Early access to new features",
      "Extended attempt history (100 attempts)",
    ],
  },
];

export default function GatePricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-center text-3xl font-extrabold">
        Choose Your Plan
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-gray-500">
        India-only payments via Razorpay (UPI, Credit/Debit, Netbanking).
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-xl border p-6 ${
              plan.highlight
                ? "border-[#00A86B] ring-2 ring-[#00A86B]/20 shadow-lg"
                : "border-gray-200"
            }`}
          >
            {plan.highlight && (
              <div className="mb-3 inline-block self-start rounded-full bg-[#00A86B]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00A86B]">
                Most Popular
              </div>
            )}
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <div className="mt-2">
              <span className="text-3xl font-extrabold">{plan.price}</span>
              {plan.period && (
                <span className="text-sm text-gray-500">{plan.period}</span>
              )}
            </div>

            <ul className="mt-6 flex-1 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00A86B]" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`mt-6 block rounded-lg py-2.5 text-center font-semibold transition-colors ${
                plan.highlight
                  ? "bg-[#00A86B] text-white hover:bg-[#009060]"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border bg-gray-50 p-6 text-center text-sm text-gray-500">
        <p className="font-semibold text-gray-700">Subscription Rules</p>
        <ul className="mt-2 space-y-1">
          <li>Active subscription required to start Ranked/Practice attempts and view reports.</li>
          <li>If your subscription expires mid-test, you can finish and submit — but report access is gated until renewal.</li>
          <li>Previously downloaded PDF scorecards remain with you.</li>
        </ul>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        Learnamyte is not affiliated with IITs, GATE organizing institutes, or
        TCS iON. &quot;GATE&quot; is used only to describe exam preparation.
      </p>
    </div>
  );
}
