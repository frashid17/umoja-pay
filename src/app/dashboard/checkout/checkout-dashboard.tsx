"use client";

import { useState, useTransition } from "react";
import {
  createDemoCheckoutAction,
  openMerchantCheckoutPreview,
  updateCheckoutBrandAction,
  uploadMerchantLogoAction,
} from "@/app/dashboard/checkout/actions";
import type { Merchant } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent";

export function CheckoutDashboard({
  merchant,
  logoUrl,
}: {
  merchant: Merchant;
  logoUrl: string | null;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Checkout branding</h2>
        <p className="mt-1 text-sm text-muted">
          Your logo and accent color appear on the hosted checkout page customers see.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-sand/40">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={merchant.name} className="h-full w-full object-contain p-2" />
            ) : (
              <span className="font-display text-2xl font-bold text-accent">
                {merchant.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <form
            className="min-w-0 flex-1 space-y-3"
            action={(fd) => {
              start(async () => {
                const res = await uploadMerchantLogoAction(fd);
                setMsg(res.error ?? (res.ok ? "Logo saved" : null));
              });
            }}
          >
            <label className="block space-y-1.5 text-sm">
              <span className="text-foreground">Upload logo</span>
              <input
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                required
                className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {pending ? "Uploading…" : "Save logo"}
            </button>
          </form>
        </div>

        <form
          className="mt-6 max-w-sm space-y-3"
          action={(fd) => {
            start(async () => {
              const res = await updateCheckoutBrandAction(fd);
              setMsg(res.error ?? (res.ok ? "Accent saved" : null));
            });
          }}
        >
          <label className="block space-y-1.5 text-sm">
            <span className="text-foreground">Brand accent (optional)</span>
            <input
              name="brandAccent"
              type="color"
              defaultValue={merchant.brand_accent || "#0d6e56"}
              className="h-10 w-full cursor-pointer rounded-md border border-border bg-background"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent/40 disabled:opacity-60"
          >
            Save accent
          </button>
        </form>
        {msg ? <p className="mt-3 text-sm text-muted">{msg}</p> : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Preview checkout</h2>
        <p className="mt-1 text-sm text-muted">
          See exactly what customers see — mobile money and card, with your logo and accent.
        </p>
        <form action={openMerchantCheckoutPreview} className="mt-5">
          <button
            type="submit"
            className="rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Open live preview
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Create test checkout</h2>
        <p className="mt-1 text-sm text-muted">
          Generate a shareable checkout link (test mode). Use preview for UI-only, or a real test
          session to charge sandbox payments.
        </p>
        <form
          className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2"
          action={(fd) => {
            start(async () => {
              const res = await createDemoCheckoutAction(fd);
              if (res.error) {
                setMsg(res.error);
                setDemoUrl(null);
                return;
              }
              setDemoUrl(res.url ?? null);
              setMsg("Checkout link ready");
            });
          }}
        >
          <label className="block space-y-1.5 text-sm">
            <span className="text-foreground">Amount (minor units)</span>
            <input name="amount" defaultValue="15000" className={inputClass} />
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
            <span className="text-foreground">Description</span>
            <input name="description" defaultValue="Order payment" className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="preview" value="1" className="rounded border-border" />
            Preview only (no charge)
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            {pending ? "Creating…" : "Create checkout link"}
          </button>
        </form>
        {demoUrl ? (
          <p className="mt-4 break-all rounded-lg border border-border bg-sand/40 px-3 py-2 font-mono text-xs text-foreground">
            <a href={demoUrl} className="text-accent hover:underline" target="_blank" rel="noreferrer">
              {demoUrl}
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
}
