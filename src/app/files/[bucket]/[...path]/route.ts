import { getSessionUser, getUserMerchant, isPlatformAdmin } from "@/lib/session";
import { getObject, isObjectBucket, isPublicBucket } from "@/lib/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path: segments } = await context.params;
  if (!isObjectBucket(bucket)) return new Response("Not found", { status: 404 });
  if (segments.some((part) => part === ".." || part === "." || part.includes("\\"))) {
    return new Response("Not found", { status: 404 });
  }

  const path = segments.map((part) => decodeURIComponent(part)).join("/");

  if (!isPublicBucket(bucket)) {
    const user = await getSessionUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const admin = await isPlatformAdmin(user.id, user.email);
    if (!admin) {
      const ctx = await getUserMerchant(user.id);
      const ownerId = path.split("/")[0];
      if (!ctx || ctx.merchant.id !== ownerId) {
        return new Response("Forbidden", { status: 403 });
      }
    }
  }

  const object = await getObject(bucket, path);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(object.bytes), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": isPublicBucket(bucket) ? "public, max-age=3600" : "private, no-store",
    },
  });
}
