// src/app/api/admin/certificates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { issueCertificate } from "@/lib/certificates";
import { SITE_URL } from "@/lib/site";

const RAW_ADMIN_SECRET = process.env.ADMIN_ISSUE_SECRET ?? "";

function normalizeSecret(value: unknown): string {
  return String(value ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    // ---------- Parse body ----------
    const body = await req.json();

    const {
      adminSecret,
      learnerName,
      learnerEmail,
      courseName,
      courseCode,
      completedOn,
    } = body;

    // ---------- Normalize / compare secrets ----------
    const envSecret = normalizeSecret(RAW_ADMIN_SECRET);
    const inputSecret = normalizeSecret(adminSecret);

    if (!envSecret) {
      console.error("[admin/certificates] ADMIN_ISSUE_SECRET is missing in env");
      return NextResponse.json(
        { ok: false, error: "Server not configured (missing secret)" },
        { status: 500 },
      );
    }

    if (process.env.NODE_ENV === "production" && inputSecret !== envSecret) {
      console.error("[admin/certificates] Secret mismatch", {
        inputLength: inputSecret.length,
        envLength: envSecret.length,
        // DO NOT log the actual secrets
      });

      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // ---------- Basic validation ----------
    if (!learnerName || !courseName || !courseCode || !completedOn) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // ---------- Issue & store certificate ----------
    const cert = await issueCertificate({
      learnerName,
      learnerEmail,
      courseName,
      courseCode,
      completedOn,
    });

    const verifyUrl = `${SITE_URL}/verify/${cert.token}`;

    return NextResponse.json(
      {
        ok: true,
        certificate: cert,
        verifyUrl,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[admin/certificates] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
