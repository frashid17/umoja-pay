"use client";

import Link from "next/link";
import { startPaymentLinkCheckout } from "@/app/pay/actions";
import { LogoMark } from "@/components/brand/logo";

export function PaymentLinkPublicView({
  merchantName,
  merchantLogoUrl,
  brandAccent,
  productName,
  description,
  amountLabel,
  productImageUrl,
  payUrl,
  slug,
}: {
  merchantName: string;
  merchantLogoUrl: string | null;
  brandAccent: string | null | undefined;
  productName: string;
  description: string | null;
  amountLabel: string;
  productImageUrl: string | null;
  payUrl: string;
  slug: string;
}) {
  const accent = brandAccent || undefined;

  return (
    <div className="relative flex min-h-svh flex-col bg-atmosphere">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="animate-checkout-pop overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-sand/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
                {merchantLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={merchantLogoUrl} alt={merchantName} className="h-full w-full object-contain p-1.5" />
                ) : (
                  <span
                    className="font-display text-2xl font-bold text-accent"
                    style={accent ? { color: accent } : undefined}
                  >
                    {merchantName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-muted">{merchantName}</p>
                <h1 className="font-display truncate text-xl font-bold text-foreground">{productName}</h1>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6">
            {productImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={productImageUrl}
                alt={productName}
                className="h-48 w-full rounded-xl object-cover"
              />
            ) : null}
            {description ? <p className="text-sm leading-relaxed text-muted">{description}</p> : null}
            <p
              className="font-display text-3xl font-bold tracking-tight text-accent"
              style={accent ? { color: accent } : undefined}
            >
              {amountLabel}
            </p>

            <form action={startPaymentLinkCheckout}>
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                className="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110"
                style={
                  accent
                    ? { backgroundColor: accent, color: "#f3fbf7" }
                    : undefined
                }
              >
                Pay now
              </button>
            </form>

            <p className="break-all text-center font-mono text-[11px] text-muted">
              <a href={payUrl} className="text-accent hover:underline">
                {payUrl}
              </a>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-border px-6 py-4 text-muted">
            <LogoMark className="h-4 w-4" />
            <Link href="/" className="text-xs font-medium hover:text-foreground">
              Powered by Umoja Pay
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
