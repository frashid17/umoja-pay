import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WebhooksForm } from "@/app/dashboard/webhooks/webhooks-form";
import { q } from "@/lib/db";
import type { WebhookEndpoint } from "@/lib/types";
import { getSessionUser, getUserMerchant } from "@/lib/session";

export default async function WebhooksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const endpoints = await q<WebhookEndpoint>`
    select * from webhook_endpoints where merchant_id = ${ctx.merchant.id}
  `;

  return (
    <AppShell
      variant="merchant"
      title="Webhooks"
      subtitle="Receive signed payment.succeeded / payment.failed events. Header: X-Umoja-Signature."
    >
      <WebhooksForm endpoints={endpoints} />
    </AppShell>
  );
}
