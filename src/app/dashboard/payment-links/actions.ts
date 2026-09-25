"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { getAppOrigin } from "@/lib/app-url";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { archivePaymentLink, createPaymentLink } from "@/lib/payment-links";
import type { CurrencyCode } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

function clean(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

/** Accept major units (150.00). Bare integers treated as major units (150 → 15000). */
function parseAmountToMinor(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major) || major <= 0) return null;
  return Math.round(major * 100);
}

export async function createPaymentLinkAction(
  formData: FormData,
): Promise<{ error?: string; url?: string; id?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const productName = clean(formData.get("productName"));
  if (!productName) return { error: "Product name is required" };

  const description = clean(formData.get("description"));
  const amount = parseAmountToMinor(String(formData.get("amount") ?? ""));
  if (amount === null || amount < 1) return { error: "Enter a valid amount" };

  const currency = String(formData.get("currency") ?? "KES") as CurrencyCode;
  if (!CURRENCIES.includes(currency)) return { error: "Invalid currency" };

  const supabase = createServiceClient();
  let imagePath: string | null = null;

  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) return { error: "Image must be under 3MB" };
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) return { error: "Use PNG, JPG, or WebP for product image" };

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const id = crypto.randomUUID();
    imagePath = `${ctx.merchant.id}/${id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-link-images")
      .upload(imagePath, file, { upsert: false, contentType: file.type });
    if (uploadError) return { error: uploadError.message };
  }

  try {
    const link = await createPaymentLink({
      merchantId: ctx.merchant.id,
      productName,
      description,
      amount,
      currency,
      imagePath,
      mode: "test",
    });

    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "payment_link.created",
      entityType: "payment_link",
      entityId: link.id,
      metadata: { slug: link.slug, amount, currency },
    });

    revalidatePath("/dashboard/payment-links");
    const origin = await getAppOrigin();
    return { url: `${origin}/pay/${link.slug}?checkout=1`, id: link.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create payment link" };
  }
}

export async function archivePaymentLinkAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing link" };

  try {
    await archivePaymentLink(id, ctx.merchant.id);
    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "payment_link.archived",
      entityType: "payment_link",
      entityId: id,
      metadata: {},
    });
    revalidatePath("/dashboard/payment-links");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not archive link" };
  }
}
