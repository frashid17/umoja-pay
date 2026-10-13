import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SettingsForms } from "@/app/dashboard/settings/settings-forms";
import { one, q } from "@/lib/db";
import { getSessionUser, getUserMerchant } from "@/lib/session";
import type { SettlementAccount } from "@/lib/types";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const account = one(
    await q<SettlementAccount>`
      select * from settlement_accounts where merchant_id = ${ctx.merchant.id}
    `,
  );

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
        account={account}
        role={ctx.membership.role}
        userEmail={user.email}
      />
    </AppShell>
  );
}
