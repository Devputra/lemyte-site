// src/lib/gate/media.ts — question images live in a private S3 bucket (ap-south-2).
//
// Question markdown references images as gate-media://<key>.png. Before an API response leaves the
// server, signMedia() swaps each reference for a presigned URL to the optimised WebP copy
// (<key>.webp, made by scripts/gate-content/webp_sync.py), so browsers fetch images straight from S3
// with no function hop. URLs are signed per 6-hour window, so the same image keeps the same URL
// (and browser cache hit) within a window. /api/gate/media stays as the fallback for the originals.
import "server-only";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.GATE_S3_BUCKET;
const REGION = process.env.GATE_S3_REGION;
if (!BUCKET) throw new Error("Missing env: GATE_S3_BUCKET");
if (!REGION) throw new Error("Missing env: GATE_S3_REGION");

const s3 = new S3Client({ region: REGION });

const WINDOW_S = 6 * 3600; // URLs stay identical within this window
const EXPIRES_S = 2 * WINDOW_S; // so every URL is valid for at least one full window
const MEDIA_RE = /gate-media:\/\/([A-Za-z0-9_./-]+)/g;

/** Original object, streamed by the /api/gate/media fallback route. */
export function getGateMedia(key: string) {
  return s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
}

const webpKey = (key: string) => key.replace(/\.png$/i, ".webp");

/** Replace every gate-media:// reference inside a JSON-serialisable value with a signed WebP URL. */
export async function signMedia<T>(value: T): Promise<T> {
  const json = JSON.stringify(value);
  const keys = [...new Set(Array.from(json.matchAll(MEDIA_RE), (m) => m[1]))];
  if (keys.length === 0) return value;

  const signingDate = new Date(Math.floor(Date.now() / (WINDOW_S * 1000)) * WINDOW_S * 1000);
  const urls = new Map(
    await Promise.all(
      keys.map(async (key) => {
        const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: webpKey(key) });
        return [key, await getSignedUrl(s3, cmd, { expiresIn: EXPIRES_S, signingDate })] as const;
      }),
    ),
  );
  // Presigned URLs contain only URL-safe characters, so they can be spliced into the JSON text.
  return JSON.parse(json.replace(MEDIA_RE, (_, key: string) => urls.get(key)!)) as T;
}
