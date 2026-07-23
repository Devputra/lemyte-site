// src/app/api/gate/sme/import/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await requireUser();

  // Verify SME or ADMIN role
  const { data: membership } = await supabaseAdmin
    .schema("gate").from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!membership || !["SME", "ADMIN"].includes(membership.role)) {
    return Response.json({ error: "SME or ADMIN role required" }, { status: 403 });
  }

  const body = await req.json();
  const { rows, format = "CSV", fileName = "import.csv" } = body as {
    rows: Array<Record<string, unknown>>;
    format?: string;
    fileName?: string;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: "No rows provided" }, { status: 400 });
  }

  // Create import batch
  const { data: batch, error: batchErr } = await supabaseAdmin
    .schema("gate").from("import_batches")
    .insert({
      uploaded_by: user.id,
      file_name: fileName,
      file_format: format,
      status: "VALIDATING",
      total_rows: rows.length,
    })
    .select("id")
    .single();

  if (batchErr || !batch) {
    return Response.json({ error: "Failed to create import batch" }, { status: 500 });
  }

  const batchId = batch.id;
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const mandatoryFields = ["question_id", "type", "difficulty", "marks", "question_text_markdown"];

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const rowErrors: Array<{ field: string; message: string }> = [];

    // Check mandatory fields
    for (const field of mandatoryFields) {
      if (!row[field] || String(row[field]).trim() === "") {
        rowErrors.push({ field, message: `Missing required field: ${field}` });
      }
    }

    // Validate type
    const type = String(row.type ?? "").toUpperCase();
    if (!["MCQ", "MSQ", "NAT"].includes(type)) {
      rowErrors.push({ field: "type", message: `Invalid type: ${type}. Must be MCQ, MSQ, or NAT` });
    }

    // Validate marks
    const marks = Number(row.marks);
    if (marks !== 1 && marks !== 2) {
      rowErrors.push({ field: "marks", message: "marks must be 1 or 2" });
    }

    // Reject raw HTML in markdown
    const markdown = String(row.question_text_markdown ?? "");
    if (/<script|<iframe|<object|<embed|onclick|onerror|onload/i.test(markdown)) {
      rowErrors.push({ field: "question_text_markdown", message: "Raw HTML/script tags are not allowed" });
    }

    // NAT-specific validation
    if (type === "NAT") {
      if (row.nat_lower_bound === undefined || row.nat_upper_bound === undefined || row.nat_precision === undefined) {
        rowErrors.push({ field: "nat_bounds", message: "NAT questions require nat_lower_bound, nat_upper_bound, and nat_precision" });
      }
      const precision = Number(row.nat_precision);
      if (!Number.isInteger(precision) || precision < 0) {
        rowErrors.push({ field: "nat_precision", message: "nat_precision must be a non-negative integer" });
      }
      if (Number(row.nat_lower_bound) > Number(row.nat_upper_bound)) {
        rowErrors.push({ field: "nat_bounds", message: "nat_lower_bound must be <= nat_upper_bound" });
      }
    }

    // MCQ/MSQ: check options and correct_option_ids
    if (type === "MCQ" || type === "MSQ") {
      if (!row.options || !Array.isArray(row.options) || (row.options as any[]).length < 2) {
        rowErrors.push({ field: "options", message: "MCQ/MSQ must have at least 2 options" });
      }
      if (!row.correct_option_ids || !Array.isArray(row.correct_option_ids) || (row.correct_option_ids as any[]).length === 0) {
        rowErrors.push({ field: "correct_option_ids", message: "MCQ/MSQ must specify correct_option_ids" });
      }
    }

    if (rowErrors.length > 0) {
      for (const re of rowErrors) {
        errors.push({ row: rowNum, ...re });
      }
    }

    // Insert row record
    await supabaseAdmin
      .schema("gate").from("import_rows")
      .insert({
        batch_id: batchId,
        row_number: rowNum,
        raw_data: row,
        is_valid: rowErrors.length === 0,
        errors: rowErrors.length > 0 ? rowErrors : null,
      });
  }

  // Atomic rule: any row fail → reject entire batch
  if (errors.length > 0) {
    await supabaseAdmin
      .schema("gate").from("import_batches")
      .update({
        status: "FAILED",
        valid_rows: rows.length - errors.length,
        error_rows: errors.length,
        error_detail: errors,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    return Response.json(
      {
        batchId,
        status: "FAILED",
        totalRows: rows.length,
        errorRows: errors.length,
        errors,
      },
      { status: 400 }
    );
  }

  // All rows valid → mark completed (actual DB inserts would happen here)
  await supabaseAdmin
    .schema("gate").from("import_batches")
    .update({
      status: "COMPLETED",
      valid_rows: rows.length,
      error_rows: 0,
      completed_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  return Response.json(
    { batchId, status: "COMPLETED", totalRows: rows.length },
    { status: 201 }
  );
}
