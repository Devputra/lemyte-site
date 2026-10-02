// src/app/api/gate/plans/route.ts — public list of active plans, cheapest first (see plans.server.ts).
import { loadActivePlans } from "@/lib/gate/plans.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ plans: await loadActivePlans() });
  } catch (error) {
    console.error("[gate/plans] query failed", error);
    return Response.json({ error: "Failed to load plans" }, { status: 500 });
  }
}
