import type { Product, ProductPrice } from "@/lib/types";
import { PRICE_INTERVALS } from "@/lib/types";

export type ProductWithPrices = Product & { prices: ProductPrice[] };

export function formatPriceMoney(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  return `${major.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function formatPriceLabel(
  price: Pick<ProductPrice, "amount" | "currency" | "billing_interval">,
) {
  const money = formatPriceMoney(price.amount, price.currency);
  const interval = PRICE_INTERVALS.find((i) => i.value === price.billing_interval);
  if (!interval || price.billing_interval === "one_time") return money;
  return `${money} ${interval.short}`;
}
