import Link from "next/link";
import { notFound } from "next/navigation";
import { startProductCheckout } from "@/app/p/actions";
import { LogoMark } from "@/components/brand/logo";
import { getMerchantForCheckout, merchantLogoPublicUrl } from "@/lib/checkout/sessions";
import { formatPriceLabel, formatPriceMoney } from "@/lib/products/format";
import { getProductBySlug, productImagePublicUrl } from "@/lib/products";
import { PRICE_INTERVALS } from "@/lib/types";

export default async function ProductStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const merchant = await getMerchantForCheckout(product.merchant_id);
  if (!merchant) notFound();

  const imageUrl = productImagePublicUrl(product.image_path);
  const logoUrl = merchantLogoPublicUrl(merchant.logo_path);
  const isPwyw = product.pricing_type === "pay_what_you_want";
  const minPrice = product.prices[0];

  return (
    <div className="min-h-svh bg-atmosphere text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <LogoMark className="h-7 w-7" />
          )}
          <span className="font-display text-sm font-semibold">{merchant.name}</span>
        </div>
        <Link href="/" className="text-xs text-muted hover:text-foreground">
          Powered by Umoja Pay
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-56 w-full object-cover sm:h-72" />
          ) : null}
          <div className="space-y-6 p-5 sm:p-8">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{product.name}</h1>
              {product.description ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">{product.description}</p>
              ) : null}
            </div>

            {error === "minimum" && minPrice ? (
              <p className="text-sm text-danger">
                Amount must be at least {formatPriceMoney(minPrice.amount, minPrice.currency)}.
              </p>
            ) : null}
            {error === "amount" ? (
              <p className="text-sm text-danger">Enter a valid amount.</p>
            ) : null}

            {isPwyw && minPrice ? (
              <form action={startProductCheckout} className="space-y-4">
                <input type="hidden" name="slug" value={product.slug} />
                <input type="hidden" name="priceId" value={minPrice.id} />
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Your amount ({minPrice.currency})</span>
                  <input
                    name="customAmount"
                    required
                    inputMode="decimal"
                    placeholder={String(minPrice.amount / 100)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 outline-none focus:border-accent"
                  />
                  {minPrice.amount > 0 ? (
                    <span className="block text-xs text-muted">
                      Minimum {formatPriceMoney(minPrice.amount, minPrice.currency)}
                    </span>
                  ) : null}
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
                >
                  Continue to pay
                </button>
              </form>
            ) : (
              <ul className="space-y-3">
                {product.prices.map((price) => {
                  const interval = PRICE_INTERVALS.find((i) => i.value === price.billing_interval);
                  return (
                    <li key={price.id}>
                      <form action={startProductCheckout}>
                        <input type="hidden" name="slug" value={product.slug} />
                        <input type="hidden" name="priceId" value={price.id} />
                        <button
                          type="submit"
                          className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3.5 text-left transition hover:border-accent/50"
                        >
                          <span>
                            <span className="block text-sm font-medium text-foreground">
                              {price.nickname || interval?.label || "Price"}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {price.billing_interval === "one_time"
                                ? "One-time payment"
                                : `Billed ${interval?.short ?? price.billing_interval}`}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-foreground">
                            {formatPriceLabel(price)}
                          </span>
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
