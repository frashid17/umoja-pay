import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CheckoutDashboard } from "@/app/dashboard/checkout/checkout-dashboard";
import { merchantLogoPublicUrl } from "@/lib/checkout/sessions";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";

export default async function MerchantCheckoutPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  return (
    <AppShell
      variant="merchant"
      title="Checkout"
      subtitle="Brand your hosted checkout, preview the customer experience, and create test payment links."
    >
      <CheckoutDashboard
        merchant={ctx.merchant}
        logoUrl={merchantLogoPublicUrl(ctx.merchant.logo_path)}
      />
    </AppShell>
  );
}
