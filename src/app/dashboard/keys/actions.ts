"use server";

import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-keys";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, getUserMerchant } from "@/lib/session";
import { dbMessage, one, q } from "@/lib/db";
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

  try {
    const data = one(
      await q<{ id: string }>`
        insert into api_keys (merchant_id, name, prefix, secret_hash, mode, created_by)
        values (
          ${ctx.merchant.id},
          ${name},
          ${generated.prefix},
          ${generated.hash},
          ${mode}::api_key_mode,
          ${user.id}
        )
        returning id
      `,
    );
    if (!data) return { error: "Failed to create key" };

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
  } catch (error) {
    return { error: dbMessage(error) };
  }
}

export async function revokeApiKeyAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const ctx = await getUserMerchant(user.id);
  if (!ctx) throw new Error("No merchant");

  const keyId = String(formData.get("keyId") ?? "");

  try {
    await q`
      update api_keys
      set revoked_at = now()
      where id = ${keyId} and merchant_id = ${ctx.merchant.id}
    `;
  } catch (error) {
    throw new Error(dbMessage(error));
  }

  await writeAuditLog({
    merchantId: ctx.merchant.id,
    actorUserId: user.id,
    action: "api_key.revoked",
    entityType: "api_key",
    entityId: keyId,
  });

  revalidatePath("/dashboard/keys");
}
