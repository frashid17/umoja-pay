"use server";

import { redirect } from "next/navigation";
import { createCheckoutSession } from "@/lib/checkout/sessions";
import { getPaymentLinkBySlug } from "@/lib/payment-links";

/** Creates a fresh checkout session and sends the customer to hosted checkout. */
export async function startPaymentLinkCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) redirect("/");

  const link = await getPaymentLinkBySlug(slug);
  if (!link) redirect("/");

  const session = await createCheckoutSession({
    merchantId: link.merchant_id,
    amount: link.amount,
    currency: link.currency,
    description: link.product_name + (link.description ? ` — ${link.description}` : ""),
    reference: `plink_${link.slug}`,
    mode: link.mode,
    isPreview: false,
    metadata: {
      payment_link_id: link.id,
      payment_link_slug: link.slug,
      product_name: link.product_name,
    },
    expiresInMinutes: 60,
  });

  redirect(`/checkout/${session.id}`);
}
