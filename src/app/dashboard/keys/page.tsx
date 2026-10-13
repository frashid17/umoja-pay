import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ApiKeysManager } from "@/app/dashboard/keys/keys-manager";
import { q } from "@/lib/db";
import type { ApiKey } from "@/lib/types";
import { getSessionUser, getUserMerchant } from "@/lib/session";

export default async function KeysPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const keys = await q<Omit<ApiKey, "secret_hash">>`
    select id, merchant_id, name, prefix, mode, last_used_at, revoked_at, created_by, created_at
    from api_keys
    where merchant_id = ${ctx.merchant.id}
    order by created_at desc
  `;

  return (
    <AppShell
      variant="merchant"
      title="API keys"
      subtitle="Authenticate requests with Authorization: Bearer uk_test_… Secrets are hashed at rest and shown once."
    >
      <div className="mb-8 rounded-2xl border border-border bg-sand/60 px-5 py-4 text-sm text-muted">
        <p>
          <strong className="text-foreground">Test keys</strong> work immediately.{" "}
          <strong className="text-foreground">Live keys</strong> require an approved KYC merchant
          (status active). Prefer rotating keys after staff changes.
        </p>
      </div>
      <ApiKeysManager keys={keys} merchantStatus={ctx.merchant.status} />
    </AppShell>
  );
}
