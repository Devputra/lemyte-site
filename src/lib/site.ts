// src/lib/site.ts — the public site address (for links in emails, certificates and auth redirects).
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://lemyte.com").replace(/\/$/, "");
