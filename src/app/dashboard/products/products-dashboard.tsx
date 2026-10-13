"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  archiveProductAction,
  createProductAction,
} from "@/app/dashboard/products/actions";
import { formatPriceLabel, type ProductWithPrices } from "@/lib/products/format";
import type {
  Merchant,
  PriceInterval,
  ProductFulfillment,
  ProductPricingType,
  ProductPrice,
} from "@/lib/types";
import {
  CURRENCIES,
  PRICE_INTERVALS,
  PRODUCT_FULFILLMENTS,
  PRODUCT_PRICING_TYPES,
} from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent";

type PriceDraft = {
  key: string;
  amount: string;
  currency: string;
  interval: PriceInterval;
};

type ProductRow = ProductWithPrices & {
  imageUrl: string | null;
  storeUrl: string;
};

function OptionCards<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; description: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl border px-3.5 py-3 text-left transition ${
              selected
                ? "border-accent bg-accent-soft/40"
                : "border-border bg-background hover:border-accent/40"
            }`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-accent bg-accent" : "border-border"
                }`}
                aria-hidden
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" /> : null}
              </span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">{option.description}</span>
            <input type="radio" name={name} value={option.value} checked={selected} readOnly className="sr-only" />
          </button>
        );
      })}
    </div>
  );
}

export function ProductsDashboard({
  merchant,
  products,
}: {
  merchant: Merchant;
  products: ProductRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [fulfillment, setFulfillment] = useState<ProductFulfillment>("goods_services");
  const [pricingType, setPricingType] = useState<ProductPricingType>("single");
  const [trackStock, setTrackStock] = useState(false);
  const [prices, setPrices] = useState<PriceDraft[]>([
    { key: "p0", amount: "", currency: "KES", interval: "one_time" },
  ]);

  const intervalOptions = useMemo(() => {
    if (pricingType === "subscription") {
      return PRICE_INTERVALS.filter((i) => i.value !== "one_time");
    }
    if (pricingType === "single" || pricingType === "pay_what_you_want") {
      return PRICE_INTERVALS.filter((i) => i.value === "one_time");
    }
    return PRICE_INTERVALS;
  }, [pricingType]);

  function resetForm() {
    setFulfillment("goods_services");
    setPricingType("single");
    setTrackStock(false);
    setPrices([{ key: "p0", amount: "", currency: "KES", interval: "one_time" }]);
  }

  function openCreate() {
    resetForm();
    setMsg(null);
    setOpen(true);
  }

  function updatePrice(key: string, patch: Partial<PriceDraft>) {
    setPrices((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addPrice() {
    const fallback: PriceInterval =
      pricingType === "subscription" ? "month" : pricingType === "usage" ? "month" : "one_time";
    setPrices((rows) => [
      ...rows,
      {
        key: `p${Date.now()}`,
        amount: "",
        currency: rows[0]?.currency ?? "KES",
        interval: fallback,
      },
    ]);
  }

  function removePrice(key: string) {
    setPrices((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  const active = products.filter((p) => p.status === "active");
  const archived = products.filter((p) => p.status === "archived");

  return (
    <div className="relative space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {active.length} active
            {archived.length ? ` · ${archived.length} archived` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Create product
        </button>
      </div>

      {msg && !open ? <p className="text-sm text-muted">{msg}</p> : null}

      {products.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <h2 className="font-display text-xl font-bold text-foreground">No products yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create a product with one or more prices. For subscriptions, add monthly, yearly, or daily
            plans customers can choose from.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Create your first product
          </button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1fr_1.2fr_auto] gap-4 border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-muted sm:grid">
            <span>Name</span>
            <span>Pricing</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-border">
            {products.map((product) => (
              <ProductListRow
                key={product.id}
                product={product}
                pending={pending}
                onArchive={() => {
                  start(async () => {
                    const fd = new FormData();
                    fd.set("id", product.id);
                    const res = await archiveProductAction(fd);
                    if (res.error) {
                      setMsg(res.error);
                      return;
                    }
                    setMsg("Product archived");
                    router.refresh();
                  });
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => !pending && setOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-xl font-bold text-foreground">Create a product</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="text-sm text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              action={(fd) => {
                start(async () => {
                  const res = await createProductAction(fd);
                  if (res.error) {
                    setMsg(res.error);
                    return;
                  }
                  setMsg("Product created");
                  setOpen(false);
                  resetForm();
                  router.refresh();
                });
              }}
            >
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                {msg && open ? <p className="text-sm text-danger">{msg}</p> : null}

                <div className="flex items-start gap-3">
                  <label className="block min-w-0 flex-1 space-y-1.5 text-sm">
                    <span className="text-foreground">
                      Name <span className="text-danger">*</span>
                    </span>
                    <input name="name" required placeholder="e.g. Essential plan" className={inputClass} />
                  </label>
                  <label className="mt-6 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted hover:border-accent/40">
                    <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" />
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M4 7.5A1.5 1.5 0 0 1 5.5 6h2.2l1.1-1.5h6.4L16.3 6H18.5A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                      />
                      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  </label>
                </div>
                <p className="text-xs text-muted">Optional photo. PNG, JPG, or WebP up to 3MB.</p>

                <label className="block space-y-1.5 text-sm">
                  <span className="text-foreground">Description</span>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="What customers get"
                    className={inputClass}
                  />
                </label>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Fulfillment type</p>
                  <OptionCards
                    name="fulfillment"
                    value={fulfillment}
                    onChange={setFulfillment}
                    options={PRODUCT_FULFILLMENTS}
                  />
                  <input type="hidden" name="fulfillment" value={fulfillment} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Pricing type</p>
                  <OptionCards
                    name="pricingType"
                    value={pricingType}
                    onChange={(next) => {
                      setPricingType(next);
                      setPrices((rows) =>
                        rows.map((row) => ({
                          ...row,
                          interval:
                            next === "subscription"
                              ? row.interval === "one_time"
                                ? "month"
                                : row.interval
                              : next === "usage"
                                ? row.interval
                                : "one_time",
                        })),
                      );
                    }}
                    options={PRODUCT_PRICING_TYPES}
                  />
                  <input type="hidden" name="pricingType" value={pricingType} />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {pricingType === "pay_what_you_want" ? "Minimum price" : "Prices"}
                  </p>
                  {prices.map((price, index) => (
                    <div key={price.key} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase tracking-[0.12em] text-muted">
                          Price {index + 1}
                        </span>
                        {prices.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removePrice(price.key)}
                            className="text-xs text-muted hover:text-danger"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem]">
                        <label className="block space-y-1 text-sm">
                          <span className="text-muted">Amount</span>
                          <input
                            name="priceAmount"
                            required
                            inputMode="decimal"
                            placeholder="1000"
                            value={price.amount}
                            onChange={(e) => updatePrice(price.key, { amount: e.target.value })}
                            className={inputClass}
                          />
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-muted">Currency</span>
                          <select
                            name="priceCurrency"
                            value={price.currency}
                            onChange={(e) => updatePrice(price.key, { currency: e.target.value })}
                            className={inputClass}
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="mt-3 block space-y-1 text-sm">
                        <span className="text-muted">Billing interval</span>
                        <select
                          name="priceInterval"
                          value={price.interval}
                          onChange={(e) =>
                            updatePrice(price.key, { interval: e.target.value as PriceInterval })
                          }
                          className={inputClass}
                        >
                          {intervalOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPrice}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-foreground transition hover:border-accent/50"
                  >
                    <span aria-hidden>+</span> Add another price
                  </button>
                  {pricingType === "subscription" ? (
                    <p className="text-xs text-muted">
                      Add monthly, yearly, or daily plans. Customers pick one at checkout; each charge
                      covers one period.
                    </p>
                  ) : null}
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Track stock</p>
                    <p className="mt-1 text-xs text-muted">
                      Stock is decremented on each sale. Enable to manage quantity.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={trackStock}
                    onClick={() => setTrackStock((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      trackStock ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition ${
                        trackStock ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                  <input type="hidden" name="trackStock" value={trackStock ? "on" : "off"} />
                </div>
                {trackStock ? (
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-foreground">Stock quantity</span>
                    <input
                      name="stockQuantity"
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={0}
                      className={inputClass}
                    />
                  </label>
                ) : null}

                <label className="block space-y-1.5 text-sm">
                  <span className="text-foreground">Mode</span>
                  <select name="mode" defaultValue="test" className={inputClass}>
                    <option value="test">Test: sandbox payments, no live money</option>
                    <option value="live" disabled={merchant.status !== "active"}>
                      Live: real charges
                      {merchant.status !== "active" ? " (requires active KYC)" : ""}
                    </option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
                >
                  {pending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function ProductListRow({
  product,
  pending,
  onArchive,
}: {
  product: ProductRow;
  pending: boolean;
  onArchive: () => void;
}) {
  const primary = product.prices[0] as ProductPrice | undefined;
  const extra = Math.max(0, product.prices.length - 1);

  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-muted">
              {product.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{product.name}</p>
          <p className="truncate text-xs text-muted">
            {product.status === "archived" ? "Archived · " : ""}
            {product.pricing_type.replaceAll("_", " ")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        {primary ? <span>{formatPriceLabel(primary)}</span> : <span className="text-muted">No price</span>}
        {extra > 0 ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
            +{extra} more
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Link
          href={product.storeUrl}
          target="_blank"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40"
        >
          Open
        </Link>
        {product.status === "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={onArchive}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:text-danger disabled:opacity-60"
          >
            Archive
          </button>
        ) : null}
      </div>
    </li>
  );
}
