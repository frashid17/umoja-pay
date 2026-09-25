import type { CurrencyCode, Payment, Refund, Settlement } from "@/lib/types";

export function formatMoney(amount: number, currency: string) {
  return `${(amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export type BalanceBucket = {
  currency: CurrencyCode;
  collected: number;
  settled: number;
  refunded: number;
  available: number;
};

const COLLECTED_STATUSES = new Set(["succeeded", "partially_refunded", "refunded"]);

export function balancesFromPayments(
  payments: Pick<Payment, "amount" | "currency" | "status" | "mode">[],
  settlements: Pick<Settlement, "amount" | "currency" | "status">[],
  mode: "test" | "live",
  refunds: Pick<Refund, "amount" | "currency" | "status" | "mode">[] = [],
): BalanceBucket[] {
  const collected = new Map<CurrencyCode, number>();
  for (const p of payments) {
    if (p.mode !== mode || !COLLECTED_STATUSES.has(p.status)) continue;
    collected.set(p.currency, (collected.get(p.currency) ?? 0) + p.amount);
  }

  const refunded = new Map<CurrencyCode, number>();
  for (const r of refunds) {
    if (r.mode !== mode || r.status !== "succeeded") continue;
    refunded.set(r.currency, (refunded.get(r.currency) ?? 0) + r.amount);
  }

  const settled = new Map<CurrencyCode, number>();
  if (mode === "live") {
    for (const s of settlements) {
      if (s.status === "paid" || s.status === "processing" || s.status === "pending") {
        settled.set(s.currency, (settled.get(s.currency) ?? 0) + s.amount);
      }
    }
  }

  const currencies = new Set<CurrencyCode>([
    ...collected.keys(),
    ...refunded.keys(),
    ...(mode === "live" ? settled.keys() : []),
  ]);

  return [...currencies]
    .map((currency) => {
      const c = collected.get(currency) ?? 0;
      const s = settled.get(currency) ?? 0;
      const rf = refunded.get(currency) ?? 0;
      return {
        currency,
        collected: c,
        settled: s,
        refunded: rf,
        available: Math.max(0, c - s - rf),
      };
    })
    .sort((a, b) => b.available - a.available || a.currency.localeCompare(b.currency));
}

export type MerchantCustomer = {
  key: string;
  phone: string | null;
  label: string;
  paymentCount: number;
  succeededCount: number;
  totals: { currency: CurrencyCode; amount: number }[];
  lastPaidAt: string | null;
  firstSeenAt: string;
};

/** Group payers by phone (MoMo) or anonymous card key from payment metadata/id. */
export function customersFromPayments(
  payments: Pick<
    Payment,
    "id" | "phone" | "amount" | "currency" | "status" | "created_at" | "metadata" | "method"
  >[],
): MerchantCustomer[] {
  type Acc = {
    key: string;
    phone: string | null;
    label: string;
    paymentCount: number;
    succeededCount: number;
    totals: Map<CurrencyCode, number>;
    lastPaidAt: string | null;
    firstSeenAt: string;
  };

  const map = new Map<string, Acc>();

  for (const p of payments) {
    const phone = p.phone?.trim() || null;
    const metaName =
      typeof p.metadata?.customer_name === "string"
        ? p.metadata.customer_name
        : typeof p.metadata?.name === "string"
          ? p.metadata.name
          : null;
    const email =
      typeof p.metadata?.email === "string" && p.metadata.email.trim()
        ? p.metadata.email.trim().toLowerCase()
        : null;

    const key = phone ?? email ?? (p.method === "card" ? "card:anonymous" : `payer:${p.id}`);
    const label =
      phone ?? email ?? metaName ?? (p.method === "card" ? "Card payers" : "Unknown payer");

    let row = map.get(key);
    if (!row) {
      row = {
        key,
        phone,
        label,
        paymentCount: 0,
        succeededCount: 0,
        totals: new Map(),
        lastPaidAt: null,
        firstSeenAt: p.created_at,
      };
      map.set(key, row);
    }

    row.paymentCount += 1;
    if (p.created_at < row.firstSeenAt) row.firstSeenAt = p.created_at;
    if (p.status === "succeeded") {
      row.succeededCount += 1;
      row.totals.set(p.currency, (row.totals.get(p.currency) ?? 0) + p.amount);
      if (!row.lastPaidAt || p.created_at > row.lastPaidAt) {
        row.lastPaidAt = p.created_at;
      }
      if (metaName && (row.label === "Card payers" || row.label === "Unknown payer")) {
        row.label = metaName;
      }
      if (email && !phone) row.label = email;
      if (phone) row.label = phone;
    }
  }

  return [...map.values()]
    .map((r) => ({
      key: r.key,
      phone: r.phone,
      label: r.label,
      paymentCount: r.paymentCount,
      succeededCount: r.succeededCount,
      totals: [...r.totals.entries()]
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((a, b) => b.amount - a.amount),
      lastPaidAt: r.lastPaidAt,
      firstSeenAt: r.firstSeenAt,
    }))
    .sort((a, b) => {
      const at = a.lastPaidAt ?? a.firstSeenAt;
      const bt = b.lastPaidAt ?? b.firstSeenAt;
      return bt.localeCompare(at);
    });
}
