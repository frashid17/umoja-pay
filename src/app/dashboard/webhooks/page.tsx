import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WebhooksForm } from "@/app/dashboard/webhooks/webhooks-form";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";

export default async function WebhooksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("merchant_id", ctx.merchant.id);

  return (
    <AppShell
      variant="merchant"
      title="Webhooks"
      subtitle="Receive signed payment.succeeded / payment.failed events. Header: X-Umoja-Signature."
    >
      <WebhooksForm endpoints={endpoints ?? []} />
    </AppShell>
  );
}
