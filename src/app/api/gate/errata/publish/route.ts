// src/app/api/gate/errata/publish/route.ts
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PublishSchema = z.object({
  errataReportId: z.string().uuid(),
  newVersionId: z.string().uuid(),
});

export async function POST(req: Request) {
  const user = await requireUser();

  // Verify ADMIN or SME role
  const { data: membership } = await supabaseAdmin
    .from("gate.memberships" as any)
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!membership || !["SME", "ADMIN"].includes(membership.role)) {
    return Response.json({ error: "SME or ADMIN role required" }, { status: 403 });
  }

  const body = await req.json();
  const input = PublishSchema.parse(body);

  // Load errata report
  const { data: report, error: reportErr } = await supabaseAdmin
    .from("gate.errata_reports" as any)
    .select("id, question_id, question_version_id, reported_by")
    .eq("id", input.errataReportId)
    .single();

  if (reportErr || !report) {
    return Response.json({ error: "Errata report not found" }, { status: 404 });
  }

  // Maker-checker: approver cannot be the reporter
  if (report.reported_by === user.id) {
    // This is okay — reporter is not the creator of the question version.
    // The constraint is creator_id != approver_id on the question_version.
  }

  // Verify new version exists and is PENDING_REVIEW
  const { data: newVersion } = await supabaseAdmin
    .from("gate.question_versions" as any)
    .select("id, question_id, status, creator_id")
    .eq("id", input.newVersionId)
    .single();

  if (!newVersion) {
    return Response.json({ error: "New version not found" }, { status: 404 });
  }

  // Maker-checker: approver cannot be the creator
  if (newVersion.creator_id === user.id) {
    return Response.json(
      { error: "Creator cannot approve their own content (maker-checker constraint)" },
      { status: 403 }
    );
  }

  // Publish the new version
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("gate.question_versions" as any)
    .update({
      status: "PUBLISHED",
      approver_id: user.id,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", input.newVersionId);

  // Create errata event
  await supabaseAdmin
    .from("gate.errata_events" as any)
    .insert({
      errata_report_id: input.errataReportId,
      question_id: report.question_id,
      from_version_id: report.question_version_id,
      to_version_id: input.newVersionId,
      approved_by: user.id,
      published_at: now,
    });

  // Update errata report status
  await supabaseAdmin
    .from("gate.errata_reports" as any)
    .update({ status: "PUBLISHED" })
    .eq("id", input.errataReportId);

  return Response.json({ ok: true, publishedAt: now });
}
