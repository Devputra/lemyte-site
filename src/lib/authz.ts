// src/lib/authz.ts
import "server-only";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server"; // ✅ use the function, not ./supabase-server

export type OrgRole = "OWNER" | "ADMIN" | "EMPLOYER" | "EMPLOYEE";

export async function requireUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  return data.user;
}

export async function requireUserFromBearer(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) return { user: null, token: null, error: "Missing Authorization: Bearer <token>" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseAuth = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) return { user: null, token: null, error: "Invalid/expired token" };

  return { user: data.user, token, error: null };
}

export async function requireOrgRole(params: { orgId: string; userId: string; allow: OrgRole[] }) {
  const { data, error } = await supabaseAdmin
    .from("org_memberships")
    .select("role")
    .eq("org_id", params.orgId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.role) return { ok: false as const, role: null };

  const role = data.role as OrgRole;
  if (!params.allow.includes(role)) return { ok: false as const, role };

  return { ok: true as const, role };
}
