// src/lib/gate/plans.server.ts — active plans, cheapest first (pricing page and /api/gate/plans).
// A plan with ends_at runs until that fixed date ("Until GATE 2027") and disappears once it has passed.
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActivePlan = {
  id: string;
  code: string;
  name: string;
  durationMonths: number;
  priceInr: number;
  endsAt: string | null;
};

export async function loadActivePlans(): Promise<ActivePlan[]> {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("plans")
    .select("id, code, name, duration_months, price_inr, ends_at")
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order("price_inr", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id as string,
    code: p.code as string,
    name: p.name as string,
    durationMonths: p.duration_months as number,
    priceInr: p.price_inr as number,
    endsAt: (p.ends_at as string | null) ?? null,
  }));
}
