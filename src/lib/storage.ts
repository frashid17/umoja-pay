import "server-only";

import { dbMessage, q } from "@/lib/db";

export {
  PUBLIC_BUCKETS,
  PRIVATE_BUCKETS,
  isObjectBucket,
  isPublicBucket,
  publicObjectUrl,
  kycFileUrl,
  type ObjectBucket,
} from "@/lib/storage/urls";

import type { ObjectBucket } from "@/lib/storage/urls";

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
