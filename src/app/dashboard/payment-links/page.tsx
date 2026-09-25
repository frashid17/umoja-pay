import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PaymentLinksDashboard } from "@/app/dashboard/payment-links/payment-links-dashboard";
import { getAppOrigin } from "@/lib/app-url";
import { merchantLogoPublicUrl } from "@/lib/checkout/sessions";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { listPaymentLinks, paymentLinkImagePublicUrl } from "@/lib/payment-links";

export default async function PaymentLinksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const origin = await getAppOrigin();
  const links = await listPaymentLinks(ctx.merchant.id);

  return (
    <AppShell
      variant="merchant"
      title="Payment links"
      subtitle="Sell with a reusable link and QR code. Customers open checkout; you can download a flyer as image or PDF."
    >
      <PaymentLinksDashboard
        merchant={ctx.merchant}
        logoUrl={merchantLogoPublicUrl(ctx.merchant.logo_path)}
        appOrigin={origin}
        links={links.map((link) => ({
          ...link,
          imageUrl: paymentLinkImagePublicUrl(link.image_path),
          payUrl: `${origin}/pay/${link.slug}?checkout=1`,
        }))}
      />
    </AppShell>
  );
}
