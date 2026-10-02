// src/app/gate/papers/media/[sig]/[...key]/route.ts — images of the free sample questions on the
// public paper pages. Only URLs minted by papers.server.ts carry a valid signature, so this route can't
// be used to read the rest of the (private) question bank. Keys are versioned (.v2 …), so responses are
// cached for a year by browsers and the CDN.
import { timingSafeEqual } from "node:crypto";

import { mediaSig } from "@/lib/gate/papers.server";
import { getGateMedia } from "@/lib/gate/media";

export const runtime = "nodejs";

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9_./-]{0,250}\.webp$/;

export async function GET(_req: Request, { params }: { params: Promise<{ sig: string; key: string[] }> }) {
  const { sig, key: parts } = await params;
  const key = parts.join("/");
  if (!KEY_RE.test(key) || key.includes("..")) return new Response("Not found", { status: 404 });

  const expected = Buffer.from(mediaSig(key.replace(/\.webp$/, ".png")));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const obj = await getGateMedia(key);
    const body = await obj.Body!.transformToByteArray();
    return new Response(Buffer.from(body), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Robots-Tag": "all",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
