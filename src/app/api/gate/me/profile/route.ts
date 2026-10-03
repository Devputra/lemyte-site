// src/app/api/gate/me/profile/route.ts — the signed-in student's profile.
//
// GET   { name, email, subject, subjects, joinedAt, planPasses, payments }
// PATCH { name?, subject? } — saved in the user's auth metadata (full_name, gate_subject). gate_subject is the
//       paper the dashboard opens on (see /api/gate/me/tracker).
// Payments list only paid and refunded orders; the Razorpay payment id is the reference for support.
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gate = () => supabaseAdmin.schema("gate");

async function activeSubjects() {
  const { data, error } = await gate().from("subjects").select("code, name, sort_order, is_active").order("sort_order");
  if (error) throw error;
  return (data ?? []).filter((s) => s.is_active !== false).map((s) => ({ code: s.code as string, name: s.name as string }));
}

export async function GET() {
  const { data: auth } = await (await supabaseServer()).auth.getUser();
  const user = auth?.user;
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  try {
    const nowIso = new Date().toISOString();
    const [subjects, passesRes, ordersRes] = await Promise.all([
      activeSubjects(),
      gate().from("access_passes").select("plan_id, starts_at, ends_at")
        .eq("user_id", user.id).eq("status", "ACTIVE").gt("ends_at", nowIso).order("starts_at"),
      gate().from("payment_orders").select("plan_id, amount_inr, status, provider_payment_id, created_at")
        .eq("user_id", user.id).in("status", ["CAPTURED", "REFUNDED"]).order("created_at", { ascending: false }),
    ]);
    if (passesRes.error) throw passesRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const planIds = [...new Set([...(passesRes.data ?? []), ...(ordersRes.data ?? [])].map((r) => r.plan_id).filter(Boolean))];
    const { data: plans } = planIds.length
      ? await gate().from("plans").select("id, name").in("id", planIds as string[])
      : { data: [] };
    const planName = new Map((plans ?? []).map((p) => [p.id as string, p.name as string]));

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const saved = typeof meta.gate_subject === "string" ? meta.gate_subject : null;
    return Response.json({
      name: (typeof meta.full_name === "string" && meta.full_name) || "",
      email: user.email ?? null,
      subject: subjects.some((s) => s.code === saved) ? saved : null,
      subjects,
      joinedAt: user.created_at,
      planPasses: (passesRes.data ?? []).map((p) => ({
        planName: planName.get(p.plan_id as string) ?? "Plan",
        startsAt: p.starts_at as string,
        endsAt: p.ends_at as string,
      })),
      payments: (ordersRes.data ?? []).map((o) => ({
        date: o.created_at as string,
        planName: planName.get(o.plan_id as string) ?? "Plan",
        amountInr: Number(o.amount_inr),
        status: o.status === "REFUNDED" ? "Refunded" : "Paid",
        reference: (o.provider_payment_id as string | null) ?? null,
      })),
    });
  } catch (err) {
    console.error("[gate/me/profile] load failed", err);
    return Response.json({ error: "Couldn't load your profile" }, { status: 500 });
  }
}

const Patch = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80).optional(),
  subject: z.string().trim().toUpperCase().max(10).nullable().optional(),
});

export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return Response.json({ error: "Authentication required" }, { status: 401 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const { name, subject } = parsed.data;

  const data: Record<string, string | null> = {};
  if (name !== undefined) data.full_name = name;
  if (subject !== undefined) {
    if (subject && !(await activeSubjects()).some((s) => s.code === subject))
      return Response.json({ error: "Unknown GATE paper" }, { status: 400 });
    data.gate_subject = subject || null;
  }
  if (!Object.keys(data).length) return Response.json({ ok: true });

  const { error } = await supabase.auth.updateUser({ data });
  if (error) {
    console.error("[gate/me/profile] update failed", error.message);
    return Response.json({ error: "Couldn't save your profile" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
