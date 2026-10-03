import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/gate/redis";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await rateLimit("subscribe", ip, 5, 3600))) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string" || email.length > 254 || !EMAIL.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const dc = process.env.MAILCHIMP_DC;
    const listId = process.env.MAILCHIMP_LIST_ID;

    if (!apiKey || !dc || !listId) {
      return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });
    }

    const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;
    
    // Basic auth (recommended by Mailchimp)
    const basic = Buffer.from(`anystring:${apiKey}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        email_address: email,
        // Double opt-in: Mailchimp emails a confirmation link, so nobody can subscribe someone else's address.
        status: "pending",
      }),
      cache: "no-store",
    });

const data: unknown = await res.json().catch(() => ({}));

// Narrow error detail if present
let detail: string | undefined;
if (typeof data === "object" && data !== null && "detail" in data) {
  const d = (data as Record<string, unknown>).detail;
  if (typeof d === "string") {
    detail = d;
  }
}

if (!res.ok) {
  return NextResponse.json(
    { ok: false, error: detail || "Mailchimp error" },
    { status: 400 }
  );
}


    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
