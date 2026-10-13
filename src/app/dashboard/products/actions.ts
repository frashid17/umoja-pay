"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { getAppOrigin } from "@/lib/app-url";
import { dbMessage } from "@/lib/db";
import { archiveProduct, createProduct } from "@/lib/products";
import { getSessionUser, getUserMerchant } from "@/lib/session";
import { putObject } from "@/lib/storage";
import type {
  CurrencyCode,
  PriceInterval,
  ProductFulfillment,
  ProductPricingType,
} from "@/lib/types";
import {
  CURRENCIES,
  PRICE_INTERVALS,
  PRODUCT_FULFILLMENTS,
  PRODUCT_PRICING_TYPES,
} from "@/lib/types";

function clean(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function parseAmountToMinor(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major) || major < 0) return null;
  return Math.round(major * 100);
}

const FULFILLMENTS = new Set(PRODUCT_FULFILLMENTS.map((f) => f.value));
const PRICING_TYPES = new Set(PRODUCT_PRICING_TYPES.map((p) => p.value));
const INTERVALS = new Set(PRICE_INTERVALS.map((i) => i.value));

export async function createProductAction(
  formData: FormData,
): Promise<{ error?: string; url?: string; id?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const name = clean(formData.get("name"));
  if (!name) return { error: "Product name is required" };

  const description = clean(formData.get("description"));
  const fulfillment = String(formData.get("fulfillment") ?? "goods_services") as ProductFulfillment;
  if (!FULFILLMENTS.has(fulfillment)) return { error: "Invalid fulfillment type" };

  const pricingType = String(formData.get("pricingType") ?? "single") as ProductPricingType;
  if (!PRICING_TYPES.has(pricingType)) return { error: "Invalid pricing type" };

  const trackStock = String(formData.get("trackStock") ?? "") === "on";
  const stockRaw = clean(formData.get("stockQuantity"));
  let stockQuantity: number | null = null;
  if (trackStock) {
    const n = Number(stockRaw ?? "0");
    if (!Number.isInteger(n) || n < 0) return { error: "Enter a valid stock quantity" };
    stockQuantity = n;
  }

  const modeRaw = String(formData.get("mode") ?? "test");
  const mode = modeRaw === "live" ? "live" : "test";
  if (mode === "live" && ctx.merchant.status !== "active") {
    return { error: "Live products require an active merchant (complete KYC first)" };
  }

  const amounts = formData.getAll("priceAmount").map(String);
  const currencies = formData.getAll("priceCurrency").map(String);
  const intervals = formData.getAll("priceInterval").map(String);
  if (!amounts.length) return { error: "Add at least one price" };

  const prices = [];
  for (let i = 0; i < amounts.length; i++) {
    const amount = parseAmountToMinor(amounts[i] ?? "");
    if (amount === null) return { error: `Price ${i + 1}: enter a valid amount` };
    if (pricingType !== "pay_what_you_want" && amount < 1) {
      return { error: `Price ${i + 1}: amount must be greater than zero` };
    }
    const currency = (currencies[i] ?? "KES") as CurrencyCode;
    if (!CURRENCIES.includes(currency)) return { error: `Price ${i + 1}: invalid currency` };
    const interval = (intervals[i] ?? "one_time") as PriceInterval;
    if (!INTERVALS.has(interval)) return { error: `Price ${i + 1}: invalid interval` };
    if (pricingType === "single" && interval !== "one_time" && amounts.length === 1) {
      // allow anyway if they picked an interval
    }
    if (pricingType === "subscription" && interval === "one_time" && amounts.length === 1) {
      // still allow one-time under subscription if they want
    }
    prices.push({ amount, currency, interval });
  }

  let imagePath: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) return { error: "Image must be under 3MB" };
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) return { error: "Use PNG, JPG, or WebP for product image" };

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const id = crypto.randomUUID();
    imagePath = `${ctx.merchant.id}/${id}.${ext}`;

    try {
      await putObject({
        bucket: "product-images",
        path: imagePath,
        bytes: new Uint8Array(await file.arrayBuffer()),
        contentType: file.type,
      });
    } catch (error) {
      return { error: dbMessage(error) };
    }
  }

  try {
    const product = await createProduct({
      merchantId: ctx.merchant.id,
      name,
      description,
      imagePath,
      fulfillment,
      pricingType,
      trackStock,
      stockQuantity,
      mode,
      prices,
    });

    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
      metadata: {
        slug: product.slug,
        pricingType,
        priceCount: prices.length,
        mode,
      },
    });

    revalidatePath("/dashboard/products");
    const origin = await getAppOrigin();
    return { url: `${origin}/p/${product.slug}`, id: product.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create product" };
  }
}

export async function archiveProductAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing product" };

  try {
    await archiveProduct(id, ctx.merchant.id);
    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "product.archived",
      entityType: "product",
      entityId: id,
      metadata: {},
    });
    revalidatePath("/dashboard/products");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not archive product" };
  }
}
