import { redirect } from "next/navigation";
import { ProductsDashboard } from "@/app/dashboard/products/products-dashboard";
import { AppShell } from "@/components/app-shell";
import { getAppOrigin } from "@/lib/app-url";
import { listProductsWithPrices, productImagePublicUrl } from "@/lib/products";
import { getSessionUser, getUserMerchant } from "@/lib/session";

export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const origin = await getAppOrigin();
  const products = await listProductsWithPrices(ctx.merchant.id);

  return (
    <AppShell
      variant="merchant"
      title="Products"
      subtitle="Catalog items with one or more prices. Add monthly, yearly, or daily plans for subscriptions."
    >
      <ProductsDashboard
        merchant={ctx.merchant}
        products={products.map((product) => ({
          ...product,
          imageUrl: productImagePublicUrl(product.image_path),
          storeUrl: `${origin}/p/${product.slug}`,
        }))}
      />
    </AppShell>
  );
}
