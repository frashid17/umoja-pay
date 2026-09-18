"use server";

import { revalidatePath } from "next/cache";
import { upsertWebhookEndpoint } from "@/lib/webhooks";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import type { ApiKeyMode } from "@/lib/types";

export async function saveWebhookAction(formData: FormData): Promise<{ signingSecret?: string; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const url = String(formData.get("url") ?? "");
  const mode = String(formData.get("mode") ?? "test") as ApiKeyMode;

  try {
    const endpoint = await upsertWebhookEndpoint({
      merchantId: ctx.merchant.id,
      url,
      mode,
    });

    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "webhook.upserted",
      entityType: "webhook_endpoint",
      entityId: endpoint.id,
      metadata: { mode, url },
    });

    revalidatePath("/dashboard/webhooks");
    return { signingSecret: endpoint.signing_secret };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
