// src/lib/email.ts

import { sendEmail } from "./email/mailer";
import type { CertificateRecord } from "./certificates";
import { SITE_URL } from "@/lib/site";

const baseUrl = SITE_URL;

export async function sendCertificateEmail(
  cert: CertificateRecord,
): Promise<void> {
  if (!cert.learnerEmail) {
    console.warn("No learnerEmail on certificate; skipping email.");
    return;
  }

  const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(cert.token)}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #193bc8;">Your Lemyte Certificate</h2>
      <p>Hi ${cert.learnerName},</p>
      <p>Congratulations on completing <strong>${cert.courseName}</strong>!</p>
      <p>Your certificate is ready. You can verify it at any time using the link below:</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background: #193bc8; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Verify Certificate
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Or copy this link: ${verifyUrl}
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Lemyte &mdash; Learn smarter.</p>
    </div>
  `.trim();

  try {
    await sendEmail({
      to: cert.learnerEmail,
      subject: `Your Lemyte Certificate — ${cert.courseName}`,
      html,
    });
  } catch (err) {
    // Email failure must not break certificate issuance
    console.error("[email] Failed to send certificate email:", err);
  }
}
