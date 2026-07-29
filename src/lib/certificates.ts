// src/lib/certificates.ts
import crypto from "crypto";
import { supabaseAdmin } from "./supabase/admin";

export type CertificateStatus = "valid" | "revoked" | "expired" | "pending";

export interface CertificateRecord {
  id: string;
  token: string;
  certificateId: string;
  learnerName: string;
  learnerEmail: string | null;
  courseName: string;
  courseCode: string;
  completedOn: string; // ISO date
  issuedBy: string;
  status: CertificateStatus;
  createdAt: string;
}

/**
 * Generate a secure, unguessable verification token.
 * This is what goes into /verify/<token> and QR codes.
 */
export function generateVerificationToken(): string {
  const bytes = crypto.randomBytes(16).toString("base64url");
  return `c_${bytes.slice(0, 20)}`; // e.g. c_tq9WcF6ZsKLD7y2pX8hR
}

/**
 * Generate a human-readable certificate ID.
 * Example: DOP-251130-7F9C
 */
export function generateCertificateId(courseCode: string): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase(); // 4 chars
  return `${courseCode}-${yy}${mm}${dd}-${suffix}`;
}

/**
 * Issue a new certificate:
 *  - generates certificateId + token
 *  - stores in Supabase
 *  - returns the record
 */
export async function issueCertificate(input: {
  learnerName: string;
  learnerEmail?: string;
  courseName: string;
  courseCode: string;
  completedOn: string; // "YYYY-MM-DD"
  certificateId?: string;          // ✅ NEW
}): Promise<CertificateRecord> {
  const token = generateVerificationToken();

  // If admin typed one, use that; else fall back to auto pattern
  const certificateId =
    input.certificateId && input.certificateId.trim().length > 0
      ? input.certificateId.trim()
      : generateCertificateId(input.courseCode);

  const { data, error } = await supabaseAdmin
    .from("certificates")
    .insert({
      token,
      certificate_id: certificateId,
      learner_name: input.learnerName,
      learner_email: input.learnerEmail ?? null,
      course_name: input.courseName,
      course_code: input.courseCode,
      completed_on: input.completedOn,
      issued_by: "Lemyte",
      status: "valid",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error inserting certificate", error);
    throw new Error("Failed to issue certificate.");
  }

  return {
    id: data.id,
    token: data.token,
    certificateId: data.certificate_id,
    learnerName: data.learner_name,
    learnerEmail: data.learner_email,
    courseName: data.course_name,
    courseCode: data.course_code,
    completedOn: data.completed_on,
    issuedBy: data.issued_by,
    status: data.status,
    createdAt: data.created_at,
  };
}

/**
 * Lookup for verification flow (/verify/[token] and /api/verify/[token]).
 */
export async function getCertificateByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    token: data.token,
    certificateId: data.certificate_id,
    learnerName: data.learner_name,
    learnerEmail: data.learner_email,
    courseName: data.course_name,
    courseCode: data.course_code,
    completedOn: data.completed_on,
    issuedBy: data.issued_by,
    status: data.status,
    createdAt: data.created_at,
  };
}
