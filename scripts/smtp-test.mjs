// scripts/smtp-test.mjs — send one test email with the SMTP settings in .env.local.
//   node scripts/smtp-test.mjs [to]      (defaults to SMTP_USER, i.e. the mailbox itself)
import fs from "node:fs";
import nodemailer from "nodemailer";

for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { SMTP_HOST, SMTP_PORT = "587", SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
if (!SMTP_PASS) throw new Error("SMTP_PASS is empty in .env.local (use a Zoho app-specific password)");
const t = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), auth: { user: SMTP_USER, pass: SMTP_PASS } });
await t.verify();
const info = await t.sendMail({
  from: SMTP_FROM || SMTP_USER,
  to: process.argv[2] || SMTP_USER,
  subject: "Lemyte SMTP test",
  text: `Sent from the Lemyte site settings at ${new Date().toISOString()}. If you can read this, website emails work.`,
});
console.log("Sent:", info.messageId, "accepted:", info.accepted.join(", "));
