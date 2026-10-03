// src/lib/gate/plans.server.ts — active plans, cheapest first (pricing page and /api/gate/plans).
// A plan with ends_at runs until that fixed date ("Until GATE 2027") and disappears once it has passed.
import "server-only";

import { type PriceTier, priceOn } from "@/lib/gate/plan-price";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActivePlan = {
  id: string;
  code: string;
  name: string;
  durationMonths: number;
  priceInr: number; // today's price (see plan-price.ts)
  endsAt: string | null;
  schedule: PriceTier[] | null; // published price steps, if any
};

export async function loadActivePlans(): Promise<ActivePlan[]> {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("plans")
    .select("id, code, name, duration_months, price_inr, ends_at, price_schedule")
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    ;
  if (error) throw error;
  const now = new Date();
  return (data ?? []).map((p) => ({
    id: p.id as string,
    code: p.code as string,
    name: p.name as string,
    durationMonths: p.duration_months as number,
    priceInr: priceOn(p as { price_inr: number; price_schedule: PriceTier[] | null }, now),
    endsAt: (p.ends_at as string | null) ?? null,
    schedule: (p.price_schedule as PriceTier[] | null) ?? null,
  })).sort((a, b) => a.priceInr - b.priceInr);
}
