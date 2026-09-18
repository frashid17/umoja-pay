import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  hashSecret,
  modeFromSecret,
  parseBearerToken,
  secretsEqual,
} from "@/lib/api-keys";
import type { ApiKey, ApiKeyMode, Merchant } from "@/lib/types";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export type AuthenticatedApiContext = {
  merchant: Merchant;
  apiKey: ApiKey;
  mode: ApiKeyMode;
  secret: string;
};

export async function authenticateApiKey(
  request: Request,
): Promise<AuthenticatedApiContext | NextResponse> {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return apiError(401, "unauthorized", "Missing or invalid Authorization header");
  }

  const mode = modeFromSecret(token);
  if (!mode) {
    return apiError(401, "unauthorized", "Invalid API key format");
  }

  const prefix = token.slice(0, `uk_${mode}_`.length + 8);
  const supabase = createServiceClient();

  const { data: key } = await supabase
    .from("api_keys")
    .select("*")
    .eq("prefix", prefix)
    .is("revoked_at", null)
    .maybeSingle();

  if (!key) {
    return apiError(401, "unauthorized", "Invalid API key");
  }

  const hash = hashSecret(token);
  if (!secretsEqual(hash, key.secret_hash)) {
    return apiError(401, "unauthorized", "Invalid API key");
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", key.merchant_id)
    .maybeSingle();

  if (!merchant) {
    return apiError(401, "unauthorized", "Merchant not found");
  }

  if (key.mode === "live" && merchant.status !== "active") {
    return apiError(403, "forbidden", "Live keys require an active merchant (KYC approved)");
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return {
    merchant: merchant as Merchant,
    apiKey: key as ApiKey,
    mode: key.mode as ApiKeyMode,
    secret: token,
  };
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
