import type { CurrencyCode } from "@/lib/types";

export function formatLinkMoney(amount: number, currency: CurrencyCode) {
  return `${(amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
