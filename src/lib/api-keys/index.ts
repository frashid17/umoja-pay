import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { ApiKeyMode } from "@/lib/types";

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function secretsEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function generateApiKey(mode: ApiKeyMode): { secret: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString("base64url");
  const prefix = `uk_${mode}_${raw.slice(0, 8)}`;
  const secret = `uk_${mode}_${raw}`;
  return {
    secret,
    prefix,
    hash: hashSecret(secret),
  };
}

export function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export function modeFromSecret(secret: string): ApiKeyMode | null {
  if (secret.startsWith("uk_test_")) return "test";
  if (secret.startsWith("uk_live_")) return "live";
  return null;
}
