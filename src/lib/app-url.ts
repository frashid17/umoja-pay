import { headers } from "next/headers";

/**
 * Public origin for the current request.
 * Prefer the request host so preview/production links are never localhost
 * unless the user is actually on localhost.
 */
export async function getAppOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  return "http://localhost:3000";
}
