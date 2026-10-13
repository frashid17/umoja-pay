"use server";

import { redirect } from "next/navigation";
import { createCheckoutSession } from "@/lib/checkout/sessions";
import { getProductBySlug, getProductPrice } from "@/lib/products";

export async function startProductCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const priceId = String(formData.get("priceId") ?? "").trim();
  if (!slug || !priceId) redirect("/");

  const product = await getProductBySlug(slug);
  if (!product || product.status !== "active") redirect("/");

  const price = await getProductPrice(priceId, product.id);
  if (!price) redirect(`/p/${slug}`);

  let amount = price.amount;
  if (product.pricing_type === "pay_what_you_want") {
    const custom = String(formData.get("customAmount") ?? "").replace(/,/g, "").trim();
    const major = Number(custom);
    if (!Number.isFinite(major) || major < 0) redirect(`/p/${slug}`);
    amount = Math.round(major * 100);
    if (amount < price.amount) redirect(`/p/${slug}?error=minimum`);
    if (amount < 1) redirect(`/p/${slug}?error=amount`);
  } else if (amount < 1) {
    redirect(`/p/${slug}`);
  }

  const intervalLabel = price.billing_interval === "one_time" ? null : price.billing_interval;

  const session = await createCheckoutSession({
    merchantId: product.merchant_id,
    amount,
    currency: price.currency,
    description:
      product.name + (intervalLabel ? ` (${intervalLabel})` : product.description ? ` - ${product.description}` : ""),
    reference: `prod_${product.slug}_${price.id.slice(0, 8)}`,
    mode: product.mode,
    isPreview: false,
    metadata: {
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      price_id: price.id,
      billing_interval: price.billing_interval,
      pricing_type: product.pricing_type,
    },
    expiresInMinutes: 60,
  });

  redirect(`/checkout/${session.id}`);
}
