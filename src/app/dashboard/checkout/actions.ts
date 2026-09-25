"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, getUserMerchant, isPlatformAdmin } from "@/lib/auth/session";
import { getAppOrigin } from "@/lib/app-url";
import { createCheckoutSession } from "@/lib/checkout/sessions";
import type { CurrencyCode } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

function clean(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

export async function uploadMerchantLogoAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a logo image" };
  }
  if (file.size > 2 * 1024 * 1024) return { error: "Logo must be under 2MB" };

  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return { error: "Use PNG, JPG, WebP, or SVG" };
  }

  const ext =
    file.type === "image/svg+xml"
      ? "svg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

  const path = `${ctx.merchant.id}/logo.${ext}`;
  const supabase = createServiceClient();

  if (ctx.merchant.logo_path && ctx.merchant.logo_path !== path) {
    await supabase.storage.from("merchant-logos").remove([ctx.merchant.logo_path]);
  }

  const { error: uploadError } = await supabase.storage.from("merchant-logos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) return { error: uploadError.message };

  const accent = clean(formData.get("brandAccent"));
  const { error } = await supabase
    .from("merchants")
    .update({
      logo_path: path,
      ...(accent !== null ? { brand_accent: accent } : {}),
    })
    .eq("id", ctx.merchant.id);

  if (error) return { error: error.message };

  await writeAuditLog({
    merchantId: ctx.merchant.id,
    actorUserId: user.id,
    action: "merchant.logo_updated",
    entityType: "merchant",
    entityId: ctx.merchant.id,
    metadata: { path },
  });

  revalidatePath("/dashboard/checkout");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateCheckoutBrandAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const accent = clean(formData.get("brandAccent"));
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("merchants")
    .update({ brand_accent: accent })
    .eq("id", ctx.merchant.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/checkout");
  return { ok: true };
}

export async function createDemoCheckoutAction(
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const amount = Number(formData.get("amount") ?? "15000");
  const currency = String(formData.get("currency") ?? "KES") as CurrencyCode;
  const description = clean(formData.get("description")) ?? "Demo checkout";
  const preview = String(formData.get("preview") ?? "") === "1";

  if (!Number.isFinite(amount) || amount < 1) return { error: "Invalid amount" };
  if (!CURRENCIES.includes(currency)) return { error: "Invalid currency" };

  try {
    const session = await createCheckoutSession({
      merchantId: ctx.merchant.id,
      amount: Math.round(amount),
      currency,
      description,
      reference: `demo_${Date.now()}`,
      mode: "test",
      isPreview: preview,
      metadata: { created_from: "merchant_dashboard" },
    });

    const appUrl = await getAppOrigin();
    return { url: `${appUrl}/checkout/${session.id}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create checkout" };
  }
}

export async function openMerchantCheckoutPreview() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const session = await createCheckoutSession({
    merchantId: ctx.merchant.id,
    amount: 15000,
    currency: "KES",
    description: "Preview payment",
    reference: "preview",
    mode: "test",
    isPreview: true,
    metadata: { created_from: "merchant_preview" },
  });

  redirect(`/checkout/${session.id}`);
}

export async function openAdminCheckoutPreview(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!(await isPlatformAdmin(user.id, user.email))) redirect("/dashboard");

  const merchantId = String(formData.get("merchantId") ?? "");
  if (!merchantId) redirect("/admin/merchants");

  const session = await createCheckoutSession({
    merchantId,
    amount: 15000,
    currency: "KES",
    description: "Admin preview payment",
    reference: "admin_preview",
    mode: "test",
    isPreview: true,
    metadata: { created_from: "admin_preview" },
  });

  redirect(`/checkout/${session.id}`);
}
