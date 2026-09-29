// GET /api/gate/me/access — { signedIn, hasPlan, name } for the site header and CTAs.
import { checkEntitlement } from "@/lib/gate/entitlements";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return Response.json({ signedIn: false, hasPlan: false, name: null });
  const ent = await checkEntitlement(user.id, "START_ATTEMPT");
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) || (user.email ?? "").split("@")[0] || null;
  return Response.json({ signedIn: true, hasPlan: ent.allowed, name });
}
