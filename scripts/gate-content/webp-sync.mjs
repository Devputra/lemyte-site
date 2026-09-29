// scripts/gate-content/webp-sync.mjs — make an optimised WebP next to every question PNG in S3.
//
//   node scripts/gate-content/webp-sync.mjs [prefix]      e.g. CS/pyq/2026_cs_1
//
// The app serves <key>.webp (src/lib/gate/media.ts); the PNG stays as the original and fallback.
// Idempotent: only converts PNGs whose WebP is missing or older. Max 1600 px wide, quality 90.
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import sharp from "sharp";

for (const line of fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const Bucket = process.env.GATE_S3_BUCKET;
const s3 = new S3Client({ region: process.env.GATE_S3_REGION });
const prefix = process.argv[2] ?? "";

const objects = new Map();
let token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }));
  for (const o of r.Contents ?? []) objects.set(o.Key, o);
  token = r.NextContinuationToken;
} while (token);

const todo = [...objects.values()].filter((o) => {
  if (!/\.png$/i.test(o.Key)) return false;
  const webp = objects.get(o.Key.replace(/\.png$/i, ".webp"));
  return !webp || webp.LastModified < o.LastModified;
});
console.log(`${todo.length} of ${[...objects.keys()].filter((k) => /\.png$/i.test(k)).length} PNGs need a WebP`);

let before = 0, after = 0, done = 0;
async function convert(o) {
  const src = await s3.send(new GetObjectCommand({ Bucket, Key: o.Key }));
  const input = Buffer.from(await src.Body.transformToByteArray());
  const out = await sharp(input).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 90, effort: 6 }).toBuffer();
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: o.Key.replace(/\.png$/i, ".webp"),
      Body: out,
      ContentType: "image/webp",
      CacheControl: "private, max-age=604800", // keys are versioned (.v1, .v2), so a week is safe
    }),
  );
  before += input.length;
  after += out.length;
  if (++done % 100 === 0) console.log(`  ${done}/${todo.length}`);
}

const queue = [...todo];
await Promise.all(Array.from({ length: 8 }, async () => { for (let o; (o = queue.shift()); ) await convert(o); }));
if (done) console.log(`converted ${done}: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
