// src/app/api/gate/media/presign/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export const runtime = "nodejs";

const PresignSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^(image\/(png|jpeg|gif|webp|svg\+xml)|application\/pdf)$/),
  fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024), // Max 10MB
  questionVersionId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();

  // Verify role: SME or ADMIN can upload regardless of subscription
  const { data: membership } = await supabaseAdmin
    .from("gate.memberships" as any)
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!membership || !["SME", "ADMIN"].includes(membership.role)) {
    // Students require active subscription to download protected assets
    // but uploading is SME/Admin only
    return Response.json({ error: "SME or ADMIN role required for upload" }, { status: 403 });
  }

  const body = await req.json();
  const input = PresignSchema.parse(body);

  // Generate unique S3 key
  const ext = input.fileName.split(".").pop() ?? "bin";
  const key = `gate/media/${crypto.randomUUID()}.${ext}`;

  // In production, this would use AWS SDK to generate a pre-signed PUT URL
  // For now, return the key and a placeholder URL
  // S3 bucket: private, Block Public Access ON, ap-south-1
  const expiresInSeconds = 15 * 60; // 15 minutes

  // Placeholder: actual S3 pre-signed URL generation
  // const { url } = await s3Client.getSignedUrl(new PutObjectCommand({
  //   Bucket: process.env.GATE_S3_BUCKET,
  //   Key: key,
  //   ContentType: input.contentType,
  //   ContentLength: input.fileSizeBytes,
  // }), { expiresIn: expiresInSeconds });

  const presignedUrl = `https://${process.env.GATE_S3_BUCKET ?? "learnamyte-gate-media"}.s3.ap-south-1.amazonaws.com/${key}?X-Amz-Expires=${expiresInSeconds}`;

  return Response.json({
    uploadUrl: presignedUrl,
    s3Key: key,
    expiresIn: expiresInSeconds,
  });
}
