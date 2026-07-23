import "server-only";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.GATE_S3_BUCKET;
const REGION = process.env.GATE_S3_REGION;

if (!BUCKET) throw new Error("Missing env: GATE_S3_BUCKET");
if (!REGION) throw new Error("Missing env: GATE_S3_REGION");

const s3 = new S3Client({ region: REGION });

export async function getGateMedia(filename: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: filename,
  });

  return s3.send(command);
}

export { BUCKET, REGION };