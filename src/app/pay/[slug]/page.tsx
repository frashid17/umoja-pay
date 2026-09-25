import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PaymentLinkPublicView } from "@/components/payment-links/public-view";
import { getAppOrigin } from "@/lib/app-url";
import { createCheckoutSession, getMerchantForCheckout, merchantLogoPublicUrl } from "@/lib/checkout/sessions";
import {
  formatLinkMoney,
  getPaymentLinkBySlug,
  paymentLinkImagePublicUrl,
} from "@/lib/payment-links";
import type { PaymentLink } from "@/lib/types";

async function openCheckout(link: PaymentLink) {
  const session = await createCheckoutSession({
    merchantId: link.merchant_id,
    amount: link.amount,
    currency: link.currency,
    description: link.product_name + (link.description ? ` — ${link.description}` : ""),
    reference: `plink_${link.slug}`,
    mode: link.mode,
    isPreview: false,
    metadata: {
      payment_link_id: link.id,
      payment_link_slug: link.slug,
      product_name: link.product_name,
    },
    expiresInMinutes: 60,
  });
  redirect(`/checkout/${session.id}`);
}

export default async function PayLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const link = await getPaymentLinkBySlug(slug);
  if (!link) notFound();

  const merchant = await getMerchantForCheckout(link.merchant_id);
  if (!merchant) notFound();

  // QR / flyer link: open hosted checkout immediately
  if (sp.checkout === "1") {
    await openCheckout(link);
  }

  const origin = await getAppOrigin();
  const payUrl = `${origin}/pay/${link.slug}?checkout=1`;

  return (
    <PaymentLinkPublicView
      merchantName={merchant.name}
      merchantLogoUrl={merchantLogoPublicUrl(merchant.logo_path)}
      brandAccent={merchant.brand_accent}
      productName={link.product_name}
      description={link.description}
      amountLabel={formatLinkMoney(link.amount, link.currency)}
      productImageUrl={paymentLinkImagePublicUrl(link.image_path)}
      payUrl={payUrl}
      slug={link.slug}
    />
  );
}

export function PayUnavailable() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-atmosphere px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Link not found</h1>
        <p className="mt-2 text-sm text-muted">This payment link is inactive or does not exist.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Powered by Umoja Pay
        </Link>
      </div>
    </div>
  );
}
