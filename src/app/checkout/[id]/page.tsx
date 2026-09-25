import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import {
  expireOpenSessionIfNeeded,
  getCheckoutSession,
  getMerchantForCheckout,
  merchantLogoPublicUrl,
} from "@/lib/checkout/sessions";
import { isPaystackConfigured } from "@/lib/paystack/client";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCheckoutSession(id);
  if (!session) notFound();

  const live = await expireOpenSessionIfNeeded(session);
  const merchant = await getMerchantForCheckout(live.merchant_id);
  if (!merchant) notFound();

  const brand = {
    id: merchant.id,
    name: merchant.name,
    logoUrl: merchantLogoPublicUrl(merchant.logo_path),
    brandAccent: merchant.brand_accent ?? null,
    supportEmail: merchant.support_email ?? null,
  };

  if (live.status === "expired" || live.status === "canceled") {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center bg-atmosphere px-4">
        <div className="w-full max-w-md animate-checkout-pop rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Checkout unavailable</h1>
          <p className="mt-2 text-sm text-muted">
            This link has {live.status === "expired" ? "expired" : "been canceled"}. Ask{" "}
            {merchant.name} for a new payment link.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
            Powered by Umoja Pay
          </Link>
        </div>
      </div>
    );
  }

  if (live.status === "completed") {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center bg-atmosphere px-4">
        <div className="w-full max-w-md animate-checkout-pop rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="font-display mt-5 text-2xl font-bold text-foreground">Already paid</h1>
          <p className="mt-2 text-sm text-muted">This checkout was completed successfully.</p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
            Powered by Umoja Pay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CheckoutClient
      session={live}
      merchant={brand}
      preview={live.is_preview}
      paystackEnabled={isPaystackConfigured(live.mode)}
    />
  );
}
