import { dbMessage, q } from "@/lib/db";

export const PUBLIC_BUCKETS = ["merchant-logos", "payment-link-images", "product-images"] as const;
export const PRIVATE_BUCKETS = ["kyc"] as const;
export type ObjectBucket = (typeof PUBLIC_BUCKETS)[number] | (typeof PRIVATE_BUCKETS)[number];

const BUCKETS = new Set<string>([...PUBLIC_BUCKETS, ...PRIVATE_BUCKETS]);

export function isObjectBucket(value: string): value is ObjectBucket {
  return BUCKETS.has(value);
}

export function isPublicBucket(value: string): boolean {
  return (PUBLIC_BUCKETS as readonly string[]).includes(value);
}

function objectPath(bucket: ObjectBucket, objectPath: string) {
  const segments = objectPath.split("/").filter(Boolean).map(encodeURIComponent);
  return `/files/${bucket}/${segments.join("/")}`;
}

export function publicObjectUrl(bucket: ObjectBucket, path: string | null | undefined) {
  if (!path) return null;
  const relative = objectPath(bucket, path);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return base ? `${base}${relative}` : relative;
}

export function kycFileUrl(path: string) {
  return objectPath("kyc", path);
}

export async function putObject(input: {
  bucket: ObjectBucket;
  path: string;
  bytes: Uint8Array;
  contentType: string;
}) {
  if (input.path.includes("..") || input.path.startsWith("/")) {
    throw new Error("Invalid object path");
  }
  const data = Buffer.from(input.bytes).toString("base64");
  try {
    await q`
      insert into stored_objects (bucket, path, content_type, data)
      values (${input.bucket}, ${input.path}, ${input.contentType}, ${data})
      on conflict (bucket, path) do update
        set content_type = excluded.content_type,
            data = excluded.data,
            created_at = now()
    `;
  } catch (error) {
    throw new Error(dbMessage(error));
  }
}

export async function deleteObject(bucket: ObjectBucket, path: string) {
  await q`delete from stored_objects where bucket = ${bucket} and path = ${path}`;
}

export async function getObject(bucket: string, path: string) {
  const rows = await q<{ content_type: string | null; data: string }>`
    select content_type, data
    from stored_objects
    where bucket = ${bucket} and path = ${path}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    contentType: row.content_type ?? "application/octet-stream",
    bytes: Buffer.from(row.data, "base64"),
  };
}
