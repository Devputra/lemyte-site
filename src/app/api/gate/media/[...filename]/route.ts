// src/app/api/gate/media/[...filename]/route.ts
//
// Serves GATE question media from a PRIVATE S3 bucket.
// Supports:
//   1) authenticated users
//   2) guest demo users via lm_demo_token cookie + recent demo attempt
//
// This keeps the bucket private while allowing the demo simulator to render
// question images for guest users.

import { type NextRequest } from "next/server";
import { getGateMedia } from "@/lib/gate/s3";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEMO_COOKIE_NAME = "lm_demo_token";

// Folder names like: 2025_cs_1
const FOLDER_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/;

// File names like: gate_pyq_2025_CS_set-1_GA_q05_stem_v1.png
const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.[a-z0-9]{2,5}$/i;

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

function getContentType(objectKey: string): string | null {
  const ext = objectKey.split(".").pop()?.toLowerCase();
  return ext ? (MIME_MAP[ext] ?? null) : null;
}

function toParts(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isValidMediaPath(parts: string[]): boolean {
  if (parts.length === 0 || parts.length > 10) return false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Reject empty / dot / traversal-like segments
    if (!part || part === "." || part === "..") return false;
    if (part.includes("\\")) return false;

    const isLast = i === parts.length - 1;
    if (isLast) {
      if (!FILE_RE.test(part)) return false;
    } else {
      if (!FOLDER_RE.test(part)) return false;
    }
  }

  return true;
}

function getObjectKey(parts: string[]): string {
  return parts.join("/");
}

function getDownloadName(parts: string[]): string {
  return parts[parts.length - 1] ?? "file";
}

async function authorizeMediaAccess(
  req: NextRequest
): Promise<
  { ok: true; actor: "auth" | "guest"; userId?: string; guestToken?: string }
  | { ok: false; status: number; error: string }
> {
  // 1) Authenticated user gets access for MVP
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (!error && data?.user) {
    return { ok: true, actor: "auth", userId: data.user.id };
  }

  // 2) Guest demo user via cookie + recent demo attempt
  const guestToken = req.cookies.get(DEMO_COOKIE_NAME)?.value ?? null;
  if (!guestToken) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 3600 * 1000
  ).toISOString();

  const { data: attempt, error: attemptErr } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select("id, mode, status, created_at")
    .eq("guest_token", guestToken)
    .eq("mode", "DEMO")
    .in("status", ["IN_PROGRESS", "SUBMITTED", "EXPIRED", "ABANDONED"])
    .gte("created_at", twentyFourHoursAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attemptErr) {
    console.error("[gate/media] guest authorization lookup failed", attemptErr);
    return { ok: false, status: 500, error: "Authorization check failed" };
  }

  if (!attempt) {
    return { ok: false, status: 403, error: "Demo access required" };
  }

  return { ok: true, actor: "guest", guestToken };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const { filename } = await params;
  const parts = toParts(filename);

  // 1) Validate path
  if (!isValidMediaPath(parts)) {
    return Response.json({ error: "Invalid media path" }, { status: 400 });
  }

  const objectKey = getObjectKey(parts);
  const downloadName = getDownloadName(parts);

  // 2) Validate content type
  const contentType = getContentType(objectKey);
  if (!contentType) {
    return Response.json({ error: "Unsupported file type" }, { status: 400 });
  }

  // 3) Authorize
  const auth = await authorizeMediaAccess(req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  // 4) Fetch from private S3
  try {
    const s3Response = await getGateMedia(objectKey);

    if (!s3Response.Body) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const stream = s3Response.Body.transformToWebStream();
    const contentLength = s3Response.ContentLength;

    const headers: HeadersInit = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${downloadName}"`,
    };

    if (contentLength !== undefined && contentLength > 0) {
      headers["Content-Length"] = String(contentLength);
    }

    return new Response(stream, { status: 200, headers });
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[gate/media] S3 error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
