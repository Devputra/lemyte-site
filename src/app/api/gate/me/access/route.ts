// GET /api/gate/me/access — { signedIn, hasPlan, name, plan } for the site header, CTAs and pricing page.
import { checkEntitlement } from "@/lib/gate/entitlements";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return Response.json({ signedIn: false, hasPlan: false, name: null, plan: null });
  const ent = await checkEntitlement(user.id, "START_ATTEMPT");
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) || (user.email ?? "").split("@")[0] || null;
  let plan: { id: string; name: string; endsAt: string | null } | null = null;
  if (ent.allowed && ent.accessPass?.planId) {
    const { data: p } = await supabaseAdmin.schema("gate").from("plans").select("id, name").eq("id", ent.accessPass.planId).maybeSingle();
    if (p) plan = { id: p.id as string, name: p.name as string, endsAt: ent.accessPass.endsAt };
  }
  return Response.json({ signedIn: true, hasPlan: ent.allowed, name, plan });
}
