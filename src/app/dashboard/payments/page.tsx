import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";

export default async function PaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const [{ data: payments }, { count: succeeded }, { count: failed }, { count: total }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("merchant_id", ctx.merchant.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", ctx.merchant.id)
        .eq("status", "succeeded"),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", ctx.merchant.id)
        .eq("status", "failed"),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", ctx.merchant.id),
    ]);

  return (
    <AppShell
      variant="merchant"
      title="Payments"
      subtitle="Every charge created with your API keys — test and live."
    >
      <div className="mb-6 grid grid-cols-3 gap-3 sm:mb-8">
        {[
          { label: "Total", value: total ?? 0 },
          { label: "Succeeded", value: succeeded ?? 0 },
          { label: "Failed", value: failed ?? 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
              {item.label}
            </p>
            <p className="font-display mt-1 text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {(payments ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-display text-xl font-semibold text-foreground">No payments yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Use a test key against POST /api/v1/payments. See the docs for sandbox phone rules.
          </p>
          <Link
            href="/docs#create-payment"
            className="mt-6 inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Open docs
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {(payments ?? []).map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-card px-4 py-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold tracking-tight text-foreground">
                    {(p.amount / 100).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    <span className="text-sm font-medium text-muted">{p.currency}</span>
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted">{p.id}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Mode</dt>
                  <dd className="mt-0.5 capitalize text-foreground">{p.mode}</dd>
                </div>
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="mt-0.5 truncate font-mono text-foreground">{p.phone}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-muted">Created</dt>
                  <dd className="mt-0.5 text-foreground">
                    {new Date(p.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </dd>
                </div>
              </dl>

              {p.reference || p.failure_reason ? (
                <p className="mt-3 text-xs text-muted">
                  {p.reference ? `Ref ${p.reference}` : null}
                  {p.reference && p.failure_reason ? " · " : null}
                  {p.failure_reason ?? null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
