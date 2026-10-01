// src/app/api/gate/plans/route.ts
//
// Public list of active plans, cheapest first. A plan with ends_at runs until that fixed date
// ("Until GATE 2027") and disappears once the date has passed.
// Read straight from gate.plans so the pricing page is always in sync.

import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("plans")
    .select("id, code, name, duration_months, price_inr, ends_at")
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order("price_inr", { ascending: true });

  if (error) {
    console.error("[gate/plans] query failed", error);
    return Response.json(
      { error: "Failed to load plans" },
      { status: 500 }
    );
  }

  return Response.json({
    plans: (data ?? []).map((p) => ({
      id: p.id as string,
      code: p.code as string,
      name: p.name as string,
      durationMonths: p.duration_months as number,
      priceInr: p.price_inr as number,
      endsAt: (p.ends_at as string | null) ?? null,
    })),
  });
}