import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SettingsForms } from "@/app/dashboard/settings/settings-forms";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import type { SettlementAccount } from "@/lib/types";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const { data: account } = await supabase
    .from("settlement_accounts")
    .select("*")
    .eq("merchant_id", ctx.merchant.id)
    .maybeSingle();

  return (
    <AppShell
      variant="merchant"
      title="Settings"
      subtitle="Business profile, settlement destination, and account access."
    >
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard/settlements" className="text-accent hover:underline">
          View settlements
        </Link>
        <span className="text-border">·</span>
        <Link href="/dashboard/kyc" className="text-accent hover:underline">
          Update KYC
        </Link>
      </div>
      <SettingsForms
        merchant={{
          ...ctx.merchant,
          support_phone: ctx.merchant.support_phone ?? null,
          statement_email: ctx.merchant.statement_email ?? null,
        }}
        account={(account as SettlementAccount | null) ?? null}
        role={ctx.membership.role}
        userEmail={user.email}
      />
    </AppShell>
  );
}
