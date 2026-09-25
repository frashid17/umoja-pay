"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  archivePaymentLinkAction,
  createPaymentLinkAction,
} from "@/app/dashboard/payment-links/actions";
import { PaymentLinkShareCard } from "@/components/payment-links/share-card";
import { formatLinkMoney } from "@/lib/payment-links";
import type { Merchant, PaymentLink } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent";

type LinkRow = PaymentLink & {
  imageUrl: string | null;
  payUrl: string;
};

export function PaymentLinksDashboard({
  merchant,
  logoUrl,
  links,
  appOrigin,
}: {
  merchant: Merchant;
  logoUrl: string | null;
  links: LinkRow[];
  appOrigin: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(links[0]?.id ?? null);
  const [pending, start] = useTransition();

  const selected = links.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Create payment link</h2>
        <p className="mt-1 text-sm text-muted">
          Name the product, set the price, optionally add an image — then share a QR code or
          downloadable flyer.
        </p>

        <form
          className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2"
          action={(fd) => {
            start(async () => {
              const res = await createPaymentLinkAction(fd);
              if (res.error) {
                setMsg(res.error);
                return;
              }
              setMsg("Payment link created");
              if (res.id) setSelectedId(res.id);
              router.refresh();
            });
          }}
        >
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="text-foreground">Product name</span>
            <input
              name="productName"
              required
              placeholder="e.g. Homemade soap set"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="text-foreground">Description</span>
            <textarea
              name="description"
              rows={3}
              placeholder="Short description for customers"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-foreground">Amount</span>
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="150.00"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-foreground">Currency</span>
            <select name="currency" defaultValue="KES" className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="text-foreground">Product image (optional)</span>
            <input
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            {pending ? "Creating…" : "Create payment link"}
          </button>
        </form>
        {msg ? <p className="mt-3 text-sm text-muted">{msg}</p> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-display text-xl font-bold text-foreground">Your links</h2>
          <p className="mt-1 text-sm text-muted">Select a link to view QR, copy URL, or download.</p>
          <ul className="mt-5 space-y-2">
            {links.length === 0 ? (
              <li className="text-sm text-muted">No payment links yet.</li>
            ) : (
              links.map((link) => {
                const active = link.id === selectedId;
                return (
                  <li key={link.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(link.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-accent bg-accent-soft"
                          : "border-border hover:border-accent/40"
                      }`}
                    >
                      <p className="truncate font-medium text-foreground">{link.product_name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatLinkMoney(link.amount, link.currency)} · {link.status}
                      </p>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-3">
          <h2 className="font-display text-xl font-bold text-foreground">Share & download</h2>
          {selected && selected.status === "active" ? (
            <div className="mt-5 space-y-4">
              <PaymentLinkShareCard
                payUrl={selected.payUrl || `${appOrigin}/pay/${selected.slug}?checkout=1`}
                merchantName={merchant.name}
                merchantLogoUrl={logoUrl}
                productName={selected.product_name}
                description={selected.description}
                amountLabel={formatLinkMoney(selected.amount, selected.currency)}
                productImageUrl={selected.imageUrl}
                brandAccent={merchant.brand_accent}
              />
              <form
                action={(fd) => {
                  start(async () => {
                    const res = await archivePaymentLinkAction(fd);
                    setMsg(res.error ?? (res.ok ? "Link archived" : null));
                    if (res.ok) {
                      setSelectedId(null);
                      router.refresh();
                    }
                  });
                }}
              >
                <input type="hidden" name="id" value={selected.id} />
                <button
                  type="submit"
                  disabled={pending}
                  className="text-sm text-danger hover:underline disabled:opacity-60"
                >
                  Archive this link
                </button>
              </form>
            </div>
          ) : selected ? (
            <p className="mt-5 text-sm text-muted">This link is archived.</p>
          ) : (
            <p className="mt-5 text-sm text-muted">Create or select a payment link to share.</p>
          )}
        </section>
      </div>
    </div>
  );
}
