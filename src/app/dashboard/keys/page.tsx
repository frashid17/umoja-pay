import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ApiKeysManager } from "@/app/dashboard/keys/keys-manager";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";

export default async function KeysPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, merchant_id, name, prefix, mode, last_used_at, revoked_at, created_by, created_at")
    .eq("merchant_id", ctx.merchant.id)
    .order("created_at", { ascending: false });

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
      <ApiKeysManager keys={keys ?? []} merchantStatus={ctx.merchant.status} />
    </AppShell>
  );
}
