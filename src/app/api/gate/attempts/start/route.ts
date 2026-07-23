// src/app/api/gate/attempts/start/route.ts
//
// PATCHED:
//   - Loads test_versions.kind and access_tier early
//   - Enforces test_version.kind === input.mode
//     (PRACTICE attempts only on PRACTICE tests; same for RANKED)
//   - Enforces "one counted ranked attempt per user per ranked test"
//     using gate.entitlements.hasCountedRankedAttempt
//   - Honors test_version.available_from / available_until windows
//   - Honors test_version.max_attempts_per_user (counts SUBMITTED+EXPIRED)
//
// Returns 422 with a clear reason when a product rule blocks the start.
//
// Everything else (Redis session bootstrap, palette init, shuffle, etc.)
// is preserved verbatim from the previous implementation.

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  checkEntitlement,
  getActiveAttempt,
  checkRetentionCap,
  hasCountedRankedAttempt,
} from "@/lib/gate/entitlements";
import {
  enforceDemoRateLimit,
  generateGuestToken,
} from "@/lib/gate/demo";
import {
  createShuffleSeed,
  getQuestionOrder,
  hashQuestionOrder,
} from "@/lib/gate/shuffle";
import {
  setAttemptSession,
  emitAttemptEvent,
  deleteAttemptSession,
} from "@/lib/gate/redis";
import { PaletteState } from "@/lib/gate/contracts";
import type { AttemptSession } from "@/lib/gate/contracts";
import crypto from "crypto";

export const runtime = "nodejs";

const DEMO_COOKIE_NAME = "lm_demo_token";

const StartSchema = z.object({
  mode: z.enum(["RANKED", "PRACTICE", "DEMO"]),
  testVersionId: z.string().uuid().optional(),
});

async function cleanupAttempt(attemptId: string) {
  const { error } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .delete()
    .eq("id", attemptId);

  if (error) {
    console.error("[gate/attempts/start] cleanupAttempt failed", {
      attemptId,
      error,
    });
  }
}

async function countCompletedAttemptsForTest(
  userId: string,
  testVersionId: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("test_version_id", testVersionId)
    .in("status", ["SUBMITTED", "EXPIRED"]);

  if (error) {
    console.error("[gate/attempts/start] countCompletedAttemptsForTest failed", {
      userId,
      testVersionId,
      error,
    });
    return 0;
  }
  return count ?? 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = StartSchema.parse(body);

    let userId: string | null = null;
    let guestToken: string | null = null;

    // ========== AUTH ==========
    if (input.mode !== "DEMO") {
      const supabase = await supabaseServer();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        return Response.json(
          { error: "Authentication required for Ranked/Practice mode" },
          { status: 401 }
        );
      }
      userId = data.user.id;

      const entitlement = await checkEntitlement(userId, "START_ATTEMPT");
      if (!entitlement.allowed) {
        return Response.json({ error: entitlement.reason }, { status: 403 });
      }
    } else {
      const supabase = await supabaseServer();
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;

      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const demoCookie = req.cookies.get(DEMO_COOKIE_NAME)?.value ?? null;

      const rateCheck = await enforceDemoRateLimit(ip, demoCookie);
      if (!rateCheck.allowed) {
        return Response.json({ error: rateCheck.reason }, { status: 429 });
      }
      guestToken = demoCookie ?? generateGuestToken();
    }

    // ========== ONE-ACTIVE-ATTEMPT GUARD ==========
    if (userId) {
      const activeAttemptId = await getActiveAttempt(userId);
      if (activeAttemptId) {
        return Response.json(
          { error: "Active attempt exists", attemptId: activeAttemptId },
          { status: 409 }
        );
      }

      if (input.mode !== "DEMO") {
        const cap = await checkRetentionCap(userId);
        if (cap.exceeded && cap.deleteAttemptId) {
          const { error: delErr } = await supabaseAdmin
            .schema("gate")
            .from("attempts")
            .delete()
            .eq("id", cap.deleteAttemptId);
          if (delErr) {
            console.error("[gate/attempts/start] retention cleanup failed", delErr);
            return Response.json(
              { error: "Failed to enforce retention cap" },
              { status: 500 }
            );
          }
        }
      }
    }

    // ========== RESOLVE TEST VERSION ==========
    let testVersionId: string;

    if (input.mode === "DEMO") {
      const { data: demoTv, error: demoErr } = await supabaseAdmin
        .schema("gate")
        .from("test_versions")
        .select("id")
        .eq("is_demo", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (demoErr || !demoTv) {
        return Response.json(
          { error: "No demo test available" },
          { status: 404 }
        );
      }
      testVersionId = demoTv.id as string;
    } else {
      // For RANKED/PRACTICE, the catalog page MUST send testVersionId.
      // Resolving an arbitrary "latest" test breaks the kind boundary, so we
      // require it here.
      if (!input.testVersionId) {
        return Response.json(
          { error: "testVersionId is required for RANKED/PRACTICE attempts" },
          { status: 400 }
        );
      }
      testVersionId = input.testVersionId;
    }

    // ========== LOAD TEST VERSION ==========
    const { data: testVersion, error: tvErr } = await supabaseAdmin
      .schema("gate")
      .from("test_versions")
      .select(
        "id, blueprint_profile_id, title, is_demo, is_active, kind, access_tier, available_from, available_until, max_attempts_per_user"
      )
      .eq("id", testVersionId)
      .single();

    if (tvErr || !testVersion) {
      return Response.json(
        { error: "Test version not found" },
        { status: 404 }
      );
    }

    if (!testVersion.is_active) {
      return Response.json(
        { error: "Test is not currently available" },
        { status: 422 }
      );
    }

    // ========== KIND ↔ MODE GUARD ==========
    if (input.mode !== "DEMO") {
      if (testVersion.is_demo) {
        return Response.json(
          { error: "Demo tests cannot be attempted in this mode" },
          { status: 422 }
        );
      }
      if (testVersion.kind !== input.mode) {
        return Response.json(
          {
            error: `Mode/kind mismatch: this test is ${testVersion.kind}, not ${input.mode}`,
          },
          { status: 422 }
        );
      }
    }

    // ========== AVAILABILITY WINDOW ==========
    const now = new Date();
    if (
      testVersion.available_from &&
      now < new Date(testVersion.available_from as string)
    ) {
      return Response.json(
        { error: "Test is not yet available" },
        { status: 422 }
      );
    }
    if (
      testVersion.available_until &&
      now > new Date(testVersion.available_until as string)
    ) {
      return Response.json(
        { error: "Test is no longer available" },
        { status: 422 }
      );
    }

    // ========== RANKED-SPECIFIC RULES ==========
    if (input.mode === "RANKED" && userId) {
      const alreadyCounted = await hasCountedRankedAttempt(userId, testVersionId);
      if (alreadyCounted) {
        return Response.json(
          {
            error:
              "You have already submitted this ranked test. View the report from your dashboard.",
          },
          { status: 422 }
        );
      }
    }

    // ========== PER-TEST ATTEMPT CAP ==========
    if (
      input.mode !== "DEMO" &&
      userId &&
      typeof testVersion.max_attempts_per_user === "number" &&
      testVersion.max_attempts_per_user > 0
    ) {
      const completed = await countCompletedAttemptsForTest(userId, testVersionId);
      if (completed >= testVersion.max_attempts_per_user) {
        return Response.json(
          {
            error: `Attempt limit reached (${testVersion.max_attempts_per_user} per user) for this test.`,
          },
          { status: 422 }
        );
      }
    }

    // ========== LOAD BLUEPRINT ==========
    const { data: bp, error: bpErr } = await supabaseAdmin
      .schema("gate")
      .from("blueprint_profiles")
      .select("duration_seconds, pass_percent")
      .eq("id", testVersion.blueprint_profile_id)
      .single();

    if (bpErr || !bp) {
      return Response.json(
        { error: "Blueprint profile not found" },
        { status: 500 }
      );
    }
    const durationSeconds = bp.duration_seconds as number;

    // ========== LOAD QUESTIONS ==========
    const { data: tvQuestions, error: tvQuestionsErr } = await supabaseAdmin
      .schema("gate")
      .from("test_version_questions")
      .select("question_version_id, section, question_order")
      .eq("test_version_id", testVersionId)
      .order("question_order", { ascending: true });

    if (tvQuestionsErr) {
      return Response.json(
        { error: "Failed to load test version questions" },
        { status: 500 }
      );
    }
    if (!tvQuestions || tvQuestions.length === 0) {
      return Response.json(
        { error: "Test version has no questions" },
        { status: 500 }
      );
    }

    const questionVersionIds = tvQuestions.map(
      (q: any) => q.question_version_id as string
    );

    // ========== SHUFFLE ==========
    const seed = createShuffleSeed();
    const questionOrder = getQuestionOrder(questionVersionIds, seed);
    const orderHash = hashQuestionOrder(questionOrder);

    // ========== INSERT ATTEMPT ==========
    const endsAt = new Date(now.getTime() + durationSeconds * 1000);
    const expiresAt =
      input.mode === "DEMO"
        ? new Date(now.getTime() + 24 * 3600 * 1000)
        : null;

    const { data: attempt, error: insErr } = await supabaseAdmin
      .schema("gate")
      .from("attempts")
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
      if (insErr?.code === "23505") {
        return Response.json(
          { error: "Active attempt already exists" },
          { status: 409 }
        );
      }
      return Response.json(
        { error: insErr?.message ?? "Failed to create attempt" },
        { status: 500 }
      );
    }

    const attemptId = attempt.id as string;

    try {
      // ========== METADATA ==========
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

      const { error: metaErr } = await supabaseAdmin
        .schema("gate")
        .from("attempt_metadata")
        .insert({
          attempt_id: attemptId,
          shuffle_seed: seed,
          question_order_hash: orderHash,
          client_ua: req.headers.get("user-agent") ?? null,
          client_ip: ip,
        });

      if (metaErr) {
        await cleanupAttempt(attemptId);
        return Response.json(
          { error: "Failed to initialize attempt metadata" },
          { status: 500 }
        );
      }

      // ========== REDIS SESSION ==========
      const palette: Record<string, PaletteState> = {};
      for (const qvId of questionOrder) {
        palette[qvId] = PaletteState.Not_Visited;
      }

      const optionOrderByQuestion: Record<string, string[]> = {};
      const { data: questionVersions, error: qvErr } = await supabaseAdmin
        .schema("gate")
        .from("question_versions")
        .select("id, options_array")
        .in("id", questionVersionIds);

      if (qvErr) {
        await cleanupAttempt(attemptId);
        return Response.json(
          { error: "Failed to load question versions" },
          { status: 500 }
        );
      }

      if (questionVersions) {
        for (const qv of questionVersions) {
          const qvId = qv.id as string;
          const options = Array.isArray(qv.options_array) ? qv.options_array : [];
          optionOrderByQuestion[qvId] = options.map((opt: any) => String(opt.id));
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

      await emitAttemptEvent({
        eventId: crypto.randomUUID(),
        attemptId,
        userId,
        type: "HEARTBEAT",
        occurredAt: now.toISOString(),
        payload: { action: "START" },
      });

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

      if (input.mode === "DEMO" && guestToken) {
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        response.headers.set(
          "Set-Cookie",
          `${DEMO_COOKIE_NAME}=${guestToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`
        );
      }

      return response;
    } catch (initErr: any) {
      console.error("[gate/attempts/start] post-insert init failed", initErr);
      try {
        await deleteAttemptSession(attemptId);
      } catch {}
      await cleanupAttempt(attemptId);
      return Response.json(
        {
          error: "Failed to initialize attempt session",
          debug: initErr?.message ?? String(initErr),
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    if (err?.issues) {
      return Response.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[gate/attempts/start] error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
