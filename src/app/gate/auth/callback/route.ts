import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value) return "/gate/dashboard";
  if (!value.startsWith("/")) return "/gate/dashboard";
  if (value.startsWith("//")) return "/gate/dashboard";
  if (!value.startsWith("/gate")) return "/gate/dashboard";
  return value;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url));
}