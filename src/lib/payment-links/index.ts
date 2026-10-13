import { isUniqueViolation, one, q } from "@/lib/db";
import { publicObjectUrl } from "@/lib/storage";
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
  let slug = slugify(input.productName);
  for (let i = 0; i < 5; i++) {
    try {
      const row = one(
        await q<PaymentLink>`
          insert into payment_links (
            merchant_id, slug, product_name, description, amount, currency,
            image_path, mode, status
          )
          values (
            ${input.merchantId},
            ${slug},
            ${input.productName},
            ${input.description ?? null},
            ${input.amount},
            ${input.currency}::currency_code,
            ${input.imagePath ?? null},
            ${input.mode ?? "test"}::api_key_mode,
            'active'
          )
          returning *
        `,
      );
      if (row) return row;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    slug = slugify(input.productName);
  }
  throw new Error("Could not allocate a unique payment link slug");
}

export async function listPaymentLinks(merchantId: string) {
  return q<PaymentLink>`
    select * from payment_links
    where merchant_id = ${merchantId}
    order by created_at desc
  `;
}

export async function getPaymentLinkBySlug(slug: string) {
  return one(
    await q<PaymentLink>`
      select * from payment_links
      where slug = ${slug} and status = 'active'
    `,
  );
}

export async function getPaymentLinkById(id: string, merchantId: string) {
  return one(
    await q<PaymentLink>`
      select * from payment_links
      where id = ${id} and merchant_id = ${merchantId}
    `,
  );
}

export async function archivePaymentLink(id: string, merchantId: string) {
  const row = one(
    await q<PaymentLink>`
      update payment_links
      set status = 'archived'
      where id = ${id} and merchant_id = ${merchantId}
      returning *
    `,
  );
  if (!row) throw new Error("Payment link not found");
  return row;
}

export function paymentLinkImagePublicUrl(imagePath: string | null | undefined) {
  return publicObjectUrl("payment-link-images", imagePath);
}

export function formatLinkMoney(amount: number, currency: CurrencyCode) {
  return `${(amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
