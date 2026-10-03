// src/lib/gate/plan-price.ts — a plan's price on a given day.
//
// Most plans have one price (plans.price_inr). A plan can also carry a published schedule
// (plans.price_schedule): tiers in date order, each valid up to and including `until` (an IST calendar date),
// the last with until = null. "Until GATE 2027" uses this so its price falls as the exam nears and it never
// costs more than another plan that would also cover the exam. Checkout and every page use this function,
// so the price shown is the price charged.

export type PriceTier = { until: string | null; price: number };

/** IST calendar date (YYYY-MM-DD) of an instant. */
export function istDate(at: Date): string {
  return new Date(at.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export function priceOn(plan: { price_inr?: number; priceInr?: number; price_schedule?: PriceTier[] | null }, at = new Date()): number {
  const base = Number(plan.price_inr ?? plan.priceInr);
  const tiers = plan.price_schedule;
  if (!tiers?.length) return base;
  const day = istDate(at);
  return (tiers.find((t) => t.until === null || day <= t.until) ?? tiers[tiers.length - 1]).price;
}

/** Add calendar months the way Postgres does (31 Jan + 1 month = 28/29 Feb), so the date shown on the plans page
 *  matches the access the database grants (gate.grant_access_for_order). */
export function addMonthsClamped(d: Date, months: number): Date {
  const out = new Date(d);
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, last));
  return out;
}

/** The tier in force on a day, with the last day it lasts (null when it runs to the end). */
export function currentTier(tiers: PriceTier[] | null | undefined, at = new Date()): PriceTier | null {
  if (!tiers?.length) return null;
  const day = istDate(at);
  return tiers.find((t) => t.until === null || day <= t.until) ?? tiers[tiers.length - 1];
}
