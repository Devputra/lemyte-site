// src/lib/email.ts

import type { CertificateRecord } from "./certificates";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.lemyte.com";

export async function sendCertificateEmail(
  cert: CertificateRecord,
): Promise<void> {
  if (!cert.learnerEmail) {
    console.warn("No learnerEmail on certificate; skipping email.");
    return;
  }

  const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(cert.token)}`;

  // TODO: Replace with Resend / SendGrid / SMTP integration.
  console.log(
    `[EMAIL STUB] Would send certificate email to ${cert.learnerEmail}:`,
  );
  console.log(`Learner: ${cert.learnerName}`);
  console.log(`Course:  ${cert.courseName}`);
  console.log(`Verify:  ${verifyUrl}`);
}
