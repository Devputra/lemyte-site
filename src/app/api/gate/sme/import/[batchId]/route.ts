// src/app/api/gate/sme/import/[batchId]/route.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ batchId: string }> }
) {
  const user = await requireUser();
  const { batchId } = await ctx.params;

  const { data: batch, error } = await supabaseAdmin
    .from("gate.import_batches" as any)
    .select("id, status, file_name, total_rows, valid_rows, error_rows, error_detail, created_at, completed_at")
    .eq("id", batchId)
    .eq("uploaded_by", user.id)
    .single();

  if (error || !batch) {
    return Response.json({ error: "Batch not found" }, { status: 404 });
  }

  return Response.json({ batch });
}
