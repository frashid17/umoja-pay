"use server";

import { redirect } from "next/navigation";
import { createCheckoutSession } from "@/lib/checkout/sessions";
import { getInvoiceBySlug } from "@/lib/invoices";

export async function startInvoiceCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) redirect("/");

  const invoice = await getInvoiceBySlug(slug);
  if (!invoice || invoice.status !== "open") redirect(`/invoice/${slug}`);
  if (invoice.amount < 1) redirect(`/invoice/${slug}`);

  const session = await createCheckoutSession({
    merchantId: invoice.merchant_id,
    amount: invoice.amount,
    currency: invoice.currency,
    description: `Invoice ${invoice.number} · ${invoice.customer_name}`,
    reference: `inv_${invoice.number}`,
    mode: invoice.mode,
    isPreview: false,
    metadata: {
      invoice_id: invoice.id,
      invoice_slug: invoice.slug,
      invoice_number: invoice.number,
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
    },
    expiresInMinutes: 60,
  });

  redirect(`/checkout/${session.id}`);
}
