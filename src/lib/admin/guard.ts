// src/lib/admin/guard.ts — admin pages are visible only to signed-in ADMIN_EMAILS accounts; others get a 404.
import "server-only";
import { notFound } from "next/navigation";

import { supabaseServer } from "@/lib/supabase/server";

const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function requireAdmin() {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user?.email || !ADMINS.includes(data.user.email.toLowerCase())) notFound();
  return data.user;
}
