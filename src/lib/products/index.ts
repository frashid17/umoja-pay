import "server-only";

import { isUniqueViolation, one, q } from "@/lib/db";
import type { ProductWithPrices } from "@/lib/products/format";
import { publicObjectUrl } from "@/lib/storage/urls";
import type {
  ApiKeyMode,
  CurrencyCode,
  PriceInterval,
  Product,
  ProductFulfillment,
  ProductPrice,
  ProductPricingType,
} from "@/lib/types";

export type { ProductWithPrices } from "@/lib/products/format";
export { formatPriceLabel, formatPriceMoney } from "@/lib/products/format";

export type CreateProductPriceInput = {
  amount: number;
  currency: CurrencyCode;
  interval: PriceInterval;
  nickname?: string | null;
};

export type CreateProductInput = {
  merchantId: string;
  name: string;
  description?: string | null;
  imagePath?: string | null;
  fulfillment: ProductFulfillment;
  pricingType: ProductPricingType;
  trackStock: boolean;
  stockQuantity?: number | null;
  mode?: ApiKeyMode;
  prices: CreateProductPriceInput[];
};

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "product"}-${suffix}`;
}

export function productImagePublicUrl(path: string | null | undefined) {
  return publicObjectUrl("product-images", path);
}

export async function createProduct(input: CreateProductInput) {
  if (!input.prices.length) {
    throw new Error("Add at least one price");
  }

  let slug = slugify(input.name);
  let product: Product | null = null;

  for (let i = 0; i < 5; i++) {
    try {
      product = one(
        await q<Product>`
          insert into products (
            merchant_id, slug, name, description, image_path, fulfillment,
            pricing_type, track_stock, stock_quantity, mode, status
          )
          values (
            ${input.merchantId},
            ${slug},
            ${input.name},
            ${input.description ?? null},
            ${input.imagePath ?? null},
            ${input.fulfillment}::product_fulfillment,
            ${input.pricingType}::product_pricing_type,
            ${input.trackStock},
            ${input.trackStock ? (input.stockQuantity ?? 0) : null},
            ${input.mode ?? "test"}::api_key_mode,
            'active'
          )
          returning *
        `,
      );
      if (product) break;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    slug = slugify(input.name);
  }

  if (!product) throw new Error("Could not allocate a unique product slug");

  const prices: ProductPrice[] = [];
  for (let index = 0; index < input.prices.length; index++) {
    const price = input.prices[index];
    const row = one(
      await q<ProductPrice>`
        insert into product_prices (
          product_id, merchant_id, amount, currency, billing_interval, nickname, sort_order
        )
        values (
          ${product.id},
          ${input.merchantId},
          ${price.amount},
          ${price.currency}::currency_code,
          ${price.interval}::price_interval,
          ${price.nickname ?? null},
          ${index}
        )
        returning *
      `,
    );
    if (row) prices.push(row);
  }

  return { ...product, prices };
}

export async function listProductsWithPrices(merchantId: string): Promise<ProductWithPrices[]> {
  const products = await q<Product>`
    select * from products
    where merchant_id = ${merchantId}
    order by created_at desc
  `;
  if (!products.length) return [];

  const prices = await q<ProductPrice>`
    select * from product_prices
    where merchant_id = ${merchantId} and active = true
    order by sort_order asc, created_at asc
  `;

  const byProduct = new Map<string, ProductPrice[]>();
  for (const price of prices) {
    const list = byProduct.get(price.product_id) ?? [];
    list.push(price);
    byProduct.set(price.product_id, list);
  }

  return products.map((product) => ({
    ...product,
    prices: byProduct.get(product.id) ?? [],
  }));
}

export async function getProductBySlug(slug: string): Promise<ProductWithPrices | null> {
  const product = one(
    await q<Product>`
      select * from products
      where slug = ${slug} and status = 'active'
    `,
  );
  if (!product) return null;

  const prices = await q<ProductPrice>`
    select * from product_prices
    where product_id = ${product.id} and active = true
    order by sort_order asc, created_at asc
  `;

  return { ...product, prices };
}

export async function getProductPrice(priceId: string, productId: string) {
  return one(
    await q<ProductPrice>`
      select * from product_prices
      where id = ${priceId} and product_id = ${productId} and active = true
    `,
  );
}

export async function archiveProduct(id: string, merchantId: string) {
  return one(
    await q<Product>`
      update products
      set status = 'archived'
      where id = ${id} and merchant_id = ${merchantId}
      returning *
    `,
  );
}
