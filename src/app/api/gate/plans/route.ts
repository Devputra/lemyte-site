// src/app/api/gate/plans/route.ts
//
// Public list of active subscription plans, ordered by duration.
// Read straight from gate.plans so the pricing page is always in sync.

import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("plans")
    .select("id, code, name, duration_months, price_inr")
    .eq("is_active", true)
    .order("duration_months", { ascending: true });

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
    })),
  });
}