// src/lib/email/mailer.ts
/**
 * Lazy-load nodemailer and fail fast if SMTP configuration is missing.
 */

type SendParams = { to: string; subject: string; html: string };

/* Minimal local transporter type so TypeScript doesn't require nodemailer types */
type TransporterLike = {
  sendMail: (opts: { from?: string; to: string; subject: string; html: string }) => Promise<unknown>;
};

let cachedTransporter: TransporterLike | null = null;

function requireSmtpEnv() {
  const missing = [
    !process.env.SMTP_HOST && "SMTP_HOST",
    !process.env.SMTP_USER && "SMTP_USER",
    !process.env.SMTP_PASS && "SMTP_PASS",
    !process.env.SMTP_FROM && "SMTP_FROM",
  ].filter(Boolean) as string[];

  if (missing.length) {
    throw new Error(`Missing SMTP environment variables: ${missing.join(", ")}`);
  }
}

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  requireSmtpEnv();

  const nodemailer = await import("nodemailer");
  cachedTransporter = (nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  }) as unknown) as TransporterLike;

  return cachedTransporter;
}

export async function sendEmail(params: SendParams) {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}