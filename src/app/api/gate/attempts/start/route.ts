// src/app/api/gate/attempts/start/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkEntitlement, getActiveAttempt, checkRetentionCap } from "@/lib/gate/entitlements";
import { enforceDemoRateLimit, generateGuestToken, getDemoTestVersionId } from "@/lib/gate/demo";
import { createShuffleSeed, getQuestionOrder, hashQuestionOrder } from "@/lib/gate/shuffle";
import { setAttemptSession, emitAttemptEvent } from "@/lib/gate/redis";
import { PaletteState } from "@/lib/gate/contracts";
import type { AttemptSession } from "@/lib/gate/contracts";
import crypto from "crypto";

export const runtime = "nodejs";

const StartSchema = z.object({
  mode: z.enum(["RANKED", "PRACTICE", "DEMO"]),
  testVersionId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = StartSchema.parse(body);

    // ========== AUTH ==========
    let userId: string | null = null;
    let guestToken: string | null = null;

    if (input.mode !== "DEMO") {
      // Require authentication for Ranked/Practice
      const supabase = supabaseServer();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        return Response.json(
          { error: "Authentication required for Ranked/Practice mode" },
          { status: 401 }
        );
      }
      userId = data.user.id;

      // Check entitlement
      const entitlement = await checkEntitlement(userId, "START_ATTEMPT");
      if (!entitlement.allowed) {
        return Response.json({ error: entitlement.reason }, { status: 403 });
      }
    } else {
      // Demo: allow unauthenticated, check rate limit
      const supabase = supabaseServer();
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const demoCookie = req.cookies.get("lm_demo_token")?.value ?? null;

      const rateCheck = await enforceDemoRateLimit(ip, demoCookie);
      if (!rateCheck.allowed) {
        return Response.json({ error: rateCheck.reason }, { status: 429 });
      }

      guestToken = demoCookie ?? generateGuestToken();
    }

    // ========== CONCURRENCY CHECK (authenticated users only) ==========
    if (userId) {
      const activeAttemptId = await getActiveAttempt(userId);
      if (activeAttemptId) {
        return Response.json(
          { error: "Active attempt exists", attemptId: activeAttemptId },
          { status: 409 }
        );
      }

      // Check retention cap
      if (input.mode !== "DEMO") {
        const cap = await checkRetentionCap(userId);
        if (cap.exceeded && cap.deleteAttemptId) {
          await supabaseAdmin
            .from("gate.attempts" as any)
            .delete()
            .eq("id", cap.deleteAttemptId);
        }
      }
    }

    // ========== RESOLVE TEST VERSION ==========
    let testVersionId: string;
    if (input.mode === "DEMO") {
      const demoId = await getDemoTestVersionId();
      if (!demoId) {
        return Response.json({ error: "No demo test available" }, { status: 404 });
      }
      testVersionId = demoId;
    } else {
      testVersionId = input.testVersionId ?? "";
      if (!testVersionId) {
        // Choose the most recent active CS/IT test version
        const { data: tv } = await supabaseAdmin
          .from("gate.test_versions" as any)
          .select("id")
          .eq("is_active", true)
          .eq("is_demo", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!tv) {
          return Response.json({ error: "No active test version found" }, { status: 404 });
        }
        testVersionId = tv.id;
      }
    }

    // ========== LOAD TEST VERSION + QUESTIONS ==========
    const { data: testVersion, error: tvErr } = await supabaseAdmin
      .from("gate.test_versions" as any)
      .select("id, blueprint_profile_id, title, is_demo")
      .eq("id", testVersionId)
      .single();

    if (tvErr || !testVersion) {
      return Response.json({ error: "Test version not found" }, { status: 404 });
    }

    const { data: bp } = await supabaseAdmin
      .from("gate.blueprint_profiles" as any)
      .select("duration_seconds, pass_percent")
      .eq("id", testVersion.blueprint_profile_id)
      .single();

    const durationSeconds = bp?.duration_seconds ?? 10800;

    const { data: tvQuestions } = await supabaseAdmin
      .from("gate.test_version_questions" as any)
      .select("question_version_id, section, question_order")
      .eq("test_version_id", testVersionId)
      .order("question_order", { ascending: true });

    if (!tvQuestions || tvQuestions.length === 0) {
      return Response.json({ error: "Test version has no questions" }, { status: 500 });
    }

    const questionVersionIds = tvQuestions.map((q: any) => q.question_version_id as string);

    // ========== GENERATE SHUFFLE ==========
    const seed = createShuffleSeed();
    const questionOrder = getQuestionOrder(questionVersionIds, seed);
    const orderHash = hashQuestionOrder(questionOrder);

    // ========== CREATE ATTEMPT IN POSTGRES ==========
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationSeconds * 1000);
    const expiresAt = input.mode === "DEMO"
      ? new Date(now.getTime() + 24 * 3600 * 1000)
      : null;

    const { data: attempt, error: insErr } = await supabaseAdmin
      .from("gate.attempts" as any)
      .insert({
        user_id: userId,
        guest_token: guestToken,
        test_version_id: testVersionId,
        mode: input.mode,
        status: "IN_PROGRESS",
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        expires_at: expiresAt?.toISOString() ?? null,
      })
      .select("id")
      .single();

    if (insErr || !attempt) {
      // Check if it's a unique constraint violation (concurrent attempt)
      if (insErr?.code === "23505") {
        return Response.json(
          { error: "Active attempt already exists" },
          { status: 409 }
        );
      }
      return Response.json({ error: insErr?.message ?? "Failed to create attempt" }, { status: 500 });
    }

    const attemptId = attempt.id as string;

    // Insert attempt metadata
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await supabaseAdmin
      .from("gate.attempt_metadata" as any)
      .insert({
        attempt_id: attemptId,
        shuffle_seed: seed,
        question_order_hash: orderHash,
        client_ua: req.headers.get("user-agent") ?? null,
        client_ip: ip,
      });

    // ========== INITIALIZE REDIS SESSION ==========
    // Build initial palette (all Not_Visited)
    const palette: Record<string, string> = {};
    for (const qvId of questionOrder) {
      palette[qvId] = PaletteState.Not_Visited;
    }

    // Default option order: natural order from DB (not shuffled)
    const optionOrderByQuestion: Record<string, string[]> = {};
    // Load options for all questions
    const { data: allOptions } = await supabaseAdmin
      .from("gate.question_options" as any)
      .select("id, question_version_id, option_index")
      .in("question_version_id", questionVersionIds)
      .order("option_index", { ascending: true });

    if (allOptions) {
      for (const opt of allOptions) {
        const qvId = opt.question_version_id as string;
        if (!optionOrderByQuestion[qvId]) optionOrderByQuestion[qvId] = [];
        optionOrderByQuestion[qvId].push(opt.id as string);
      }
    }

    const session: AttemptSession = {
      attemptId,
      userId,
      guestToken,
      testVersionId,
      mode: input.mode,
      status: "IN_PROGRESS",
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      lastSeenAt: now.toISOString(),
      shuffleSeed: seed,
      questionOrder,
      optionOrderByQuestion,
      currentQuestionId: questionOrder[0],
      palette,
      drafts: {},
      committed: {},
      calculator: { memory: 0 },
      focusLostCount: 0,
      focusLostSeconds: 0,
      versionCounter: 0,
    };

    await setAttemptSession(session, durationSeconds);

    // Emit initial heartbeat event
    await emitAttemptEvent({
      eventId: crypto.randomUUID(),
      attemptId,
      userId,
      type: "HEARTBEAT",
      occurredAt: now.toISOString(),
      payload: { action: "START" },
    });

    // ========== RESPONSE ==========
    const response = Response.json(
      {
        attemptId,
        endsAt: endsAt.toISOString(),
        shuffleSeed: seed,
        currentQuestionId: questionOrder[0],
        palette,
        questionOrder,
        optionOrderByQuestion,
        serverTime: now.toISOString(),
      },
      { status: 201 }
    );

    // Set demo cookie if guest
    if (input.mode === "DEMO" && guestToken) {
      response.headers.set(
        "Set-Cookie",
        `lm_demo_token=${guestToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      );
    }

    return response;
  } catch (err: any) {
    if (err?.issues) {
      // Zod validation error
      return Response.json({ error: "Invalid request body", details: err.issues }, { status: 400 });
    }
    console.error("[gate/attempts/start] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
