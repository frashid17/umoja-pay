import { redirect } from "next/navigation";
import { InvoicesDashboard } from "@/app/dashboard/invoices/invoices-dashboard";
import { AppShell } from "@/components/app-shell";
import { getAppOrigin } from "@/lib/app-url";
import { listInvoices } from "@/lib/invoices";
import { getSessionUser, getUserMerchant } from "@/lib/session";

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const origin = await getAppOrigin();
  const invoices = await listInvoices(ctx.merchant.id);

  return (
    <AppShell
      variant="merchant"
      title="Invoices"
      subtitle="Bill customers with line items and a due date. Share a link so they can pay online."
    >
      <InvoicesDashboard
        merchant={ctx.merchant}
        invoices={invoices.map((invoice) => ({
          ...invoice,
          payUrl: `${origin}/invoice/${invoice.slug}`,
        }))}
      />
    </AppShell>
  );
}
