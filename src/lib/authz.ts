// src/lib/authz.ts
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  return data.user;
}
