// src/app/api/certificate/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCertificateByToken } from "@/lib/certificates";

const CERT_BUCKET = "certificates";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  // In Next 15, params is a Promise
  const { token } = await params;

  const certificate = await getCertificateByToken(token);
  if (!certificate) {
    return NextResponse.json(
      { ok: false, error: "Certificate not found" },
      { status: 404 },
    );
  }

  const filePath = `${certificate.certificateId}.pdf`;

  const { data, error } = await supabaseAdmin.storage
    .from(CERT_BUCKET)
    .download(filePath);

  if (error || !data) {
    console.error("Error downloading certificate PDF:", error);
    return NextResponse.json(
      { ok: false, error: "Certificate PDF not found" },
      { status: 404 },
    );
  }

  const arrayBuffer = await data.arrayBuffer();

  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificateId}.pdf"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
