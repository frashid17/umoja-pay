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
