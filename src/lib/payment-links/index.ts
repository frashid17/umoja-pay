import { createServiceClient } from "@/lib/supabase/admin";
import type { ApiKeyMode, CurrencyCode, PaymentLink } from "@/lib/types";

export type CreatePaymentLinkInput = {
  merchantId: string;
  productName: string;
  description?: string | null;
  amount: number;
  currency: CurrencyCode;
  imagePath?: string | null;
  mode?: ApiKeyMode;
};

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "pay"}-${suffix}`;
}

export async function createPaymentLink(input: CreatePaymentLinkInput) {
  const supabase = createServiceClient();
  let slug = slugify(input.productName);
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("payment_links")
      .insert({
        merchant_id: input.merchantId,
        slug,
        product_name: input.productName,
        description: input.description ?? null,
        amount: input.amount,
        currency: input.currency,
        image_path: input.imagePath ?? null,
        mode: input.mode ?? "test",
        status: "active",
      })
      .select("*")
      .single();

    if (!error && data) return data as PaymentLink;
    if (error?.code !== "23505") throw error;
    slug = slugify(input.productName);
  }
  throw new Error("Could not allocate a unique payment link slug");
}

export async function listPaymentLinks(merchantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PaymentLink[];
}

export async function getPaymentLinkBySlug(slug: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data as PaymentLink | null;
}

export async function getPaymentLinkById(id: string, merchantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw error;
  return data as PaymentLink | null;
}

export async function archivePaymentLink(id: string, merchantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payment_links")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("merchant_id", merchantId)
    .select("*")
    .single();

  if (error) throw error;
  return data as PaymentLink;
}

export function paymentLinkImagePublicUrl(imagePath: string | null | undefined) {
  if (!imagePath) return null;
  const supabase = createServiceClient();
  const { data } = supabase.storage.from("payment-link-images").getPublicUrl(imagePath);
  return data.publicUrl;
}

export function formatLinkMoney(amount: number, currency: CurrencyCode) {
  return `${(amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
