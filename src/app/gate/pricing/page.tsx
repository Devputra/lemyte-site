// src/app/gate/pricing/page.tsx — plans are loaded on the server (prices are in the HTML for search and
// AI crawlers); checkout and the "your plan" view are in PricingClient.
import { FaqList } from "@/components/site/FaqList";
import { Container, type } from "@/components/site/ui";
import { fmtInr } from "@/lib/gate/catalog";
import { getCatalog } from "@/lib/gate/catalog.server";
import { currentTier } from "@/lib/gate/plan-price";
import { loadActivePlans } from "@/lib/gate/plans.server";
import { LEGAL } from "@/lib/legal";
import { abs, type Faq, JsonLd, pageMeta } from "@/lib/seo";

import { PricingClient } from "./PricingClient";

export const revalidate = 300;

export async function generateMetadata() {
  const [plans, { totals }] = await Promise.all([loadActivePlans(), getCatalog()]);
  return pageMeta({
    title: "GATE test series plans and pricing",
    description: `Plans from ${fmtInr(Math.min(...plans.map((p) => p.priceInr)))} for all ${totals.papers} official GATE papers in ${totals.subjects} subjects, topic practice and ranked tests. No auto-renewal; refund within ${LEGAL.refundWindowDays} days.`,
    path: "/gate/pricing",
  });
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function PricingPage() {
  const [plans, { totals, rankedTests }] = await Promise.all([loadActivePlans(), getCatalog()]);
  const planList = plans
    .map((p) => {
      const tier = currentTier(p.schedule);
      const steps = p.schedule && p.schedule.length > 1 ? `; the price steps down to ${p.schedule.filter((t) => t.price < p.priceInr).map((t) => fmtInr(t.price)).join(", ")} as the exam gets closer` : "";
      return `${p.name}: ${fmtInr(p.priceInr)}${p.endsAt ? ` (access until ${fmtDate(p.endsAt)}${tier?.until ? `; this price until ${fmtDate(tier.until)}` : ""}${steps})` : ""}`;
    })
    .join("; ");
  const faqs: Faq[] = [
    { q: "How much does Lemyte cost?", a: `${planList}. Every plan includes everything; only the length of access differs.` },
    {
      q: "What do I get with a plan?",
      a: `All ${totals.papers} official GATE papers across ${totals.subjects} subjects as timed tests, topic practice on any topic, ${rankedTests > 0 ? "ranked tests" : "ranked tests once they are scheduled (none yet)"}, and a full report with worked solutions after every test.`,
    },
    { q: "Is there a free option?", a: "Yes. The General Aptitude demo test is free and needs no payment details. It uses the same exam screen and report as the paid tests." },
    { q: "Does my plan renew automatically?", a: "No. Plans are one-time payments and never renew. When a plan ends, you can buy another one if you need more time." },
    {
      q: "Can I get a refund?",
      a: `Yes. You can ask for a full refund within ${LEGAL.refundWindowDays} days of payment if you have started no more than ${LEGAL.refundMaxAttempts} tests. Write to ${LEGAL.email}.`,
    },
    { q: "How do I pay?", a: "Payments go through Razorpay, using UPI, debit or credit cards, or net banking. Access starts as soon as the payment is confirmed; if you already have a plan, the new one starts when the current one ends." },
  ];
  const offersLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Lemyte GATE test series",
    description: `Official GATE PYQs (${totals.papers} papers, ${totals.subjects} subjects) as timed tests marked with the official answer key, with topic practice and reports.`,
    brand: { "@type": "Brand", name: "Lemyte" },
    url: abs("/gate/pricing"),
    image: abs("/opengraph-image"),
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.priceInr,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: abs("/gate/pricing"),
      ...(p.endsAt && { priceValidUntil: currentTier(p.schedule)?.until ?? p.endsAt.slice(0, 10) }),
    })),
  };

  return (
    <>
      <JsonLd data={offersLd} />
      <PricingClient initialPlans={plans} totals={totals} rankedTests={rankedTests} />
      <section className="border-t border-zinc-100 bg-white" aria-labelledby="pricing-faq">
        <Container className="py-14 sm:py-20">
          <h2 id="pricing-faq" className={type.h2}>Questions about plans</h2>
          <FaqList faqs={faqs} className="mt-6 max-w-3xl" />
        </Container>
      </section>
    </>
  );
}
