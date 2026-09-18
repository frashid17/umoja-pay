import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { SandboxConsole } from "@/app/dashboard/sandbox/sandbox-console";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";

export default async function SandboxPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const { data: recent } = await supabase
    .from("payments")
    .select("*")
    .eq("merchant_id", ctx.merchant.id)
    .eq("mode", "test")
    .order("created_at", { ascending: false })
    .limit(8);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <AppShell
      variant="merchant"
      title="Sandbox"
      subtitle="Simulate M-Pesa STK payments for your merchant without live money. Same payment objects as the API."
    >
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="rounded-md bg-accent-soft px-2.5 py-1 font-medium text-accent">
          Test mode
        </span>
        <Link href="/docs/sandbox" className="text-muted hover:text-foreground">
          Sandbox docs
        </Link>
        <Link href="/dashboard/keys" className="text-muted hover:text-foreground">
          API keys
        </Link>
        <Link href="/dashboard/webhooks" className="text-muted hover:text-foreground">
          Webhooks
        </Link>
      </div>

      <SandboxConsole appUrl={appUrl} />

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Recent sandbox payments
          </h2>
          <Link href="/dashboard/payments" className="text-sm text-muted hover:text-foreground">
            View all
          </Link>
        </div>

        {!recent?.length ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted">
            No sandbox payments yet. Run one above.
          </div>
        ) : (
          <ul className="space-y-3">
            {recent.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card px-4 py-3.5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-foreground">
                      {p.amount} {p.currency}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted">{p.phone}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                  <div className="min-w-0">
                    <dt className="text-muted">Reference</dt>
                    <dd className="mt-0.5 truncate text-foreground">{p.reference ?? "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted">When</dt>
                    <dd className="mt-0.5 text-foreground">
                      {new Date(p.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
