"use server";

import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-keys";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/admin";
import type { ApiKeyMode } from "@/lib/types";

export async function createApiKeyAction(
  formData: FormData,
): Promise<{ secret: string } | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const name = String(formData.get("name") ?? "Default");
  const mode = String(formData.get("mode") ?? "test") as ApiKeyMode;

  if (mode === "live" && ctx.merchant.status !== "active") {
    return { error: "Live keys require approved KYC" };
  }

  const generated = generateApiKey(mode);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      merchant_id: ctx.merchant.id,
      name,
      prefix: generated.prefix,
      secret_hash: generated.hash,
      mode,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create key" };

  await writeAuditLog({
    merchantId: ctx.merchant.id,
    actorUserId: user.id,
    action: "api_key.created",
    entityType: "api_key",
    entityId: data.id,
    metadata: { mode, name, prefix: generated.prefix },
  });

  revalidatePath("/dashboard/keys");
  return { secret: generated.secret };
}

export async function revokeApiKeyAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const ctx = await getUserMerchant(user.id);
  if (!ctx) throw new Error("No merchant");

  const keyId = String(formData.get("keyId") ?? "");
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("merchant_id", ctx.merchant.id);

  if (error) throw new Error(error.message);

  await writeAuditLog({
    merchantId: ctx.merchant.id,
    actorUserId: user.id,
    action: "api_key.revoked",
    entityType: "api_key",
    entityId: keyId,
  });

  revalidatePath("/dashboard/keys");
}
