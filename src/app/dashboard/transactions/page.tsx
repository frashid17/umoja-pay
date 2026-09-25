import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { formatMoney } from "@/lib/merchant-finance";
import type { Payment } from "@/lib/types";

export default async function TransactionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const [{ data: payments }, { count: succeeded }, { count: pending }, { count: failed }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("merchant_id", ctx.merchant.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", ctx.merchant.id)
        .eq("status", "succeeded"),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", ctx.merchant.id)
        .in("status", ["pending", "processing"]),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", ctx.merchant.id)
        .eq("status", "failed"),
    ]);

  const rows = (payments ?? []) as Payment[];

  return (
    <AppShell
      variant="merchant"
      title="Transactions"
      subtitle="Every payment on your account — test and live. Filter by status from the summary above."
    >
      <div className="mb-6 grid grid-cols-3 gap-3 sm:mb-8">
        {[
          { label: "Succeeded", value: succeeded ?? 0 },
          { label: "Pending", value: pending ?? 0 },
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

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard/balances" className="text-accent hover:underline">
          View balances
        </Link>
        <span className="text-border">·</span>
        <Link href="/dashboard/customers" className="text-accent hover:underline">
          View customers
        </Link>
        <span className="text-border">·</span>
        <Link href="/dashboard/refunds" className="text-accent hover:underline">
          Refunds
        </Link>
        <span className="text-border">·</span>
        <Link href="/dashboard/payments" className="text-muted hover:text-foreground">
          Payments list
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-display text-xl font-semibold text-foreground">No transactions yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Charges from checkout, payment links, and the API appear here.
          </p>
          <Link
            href="/dashboard/sandbox"
            className="mt-6 inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Try sandbox
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const product =
              typeof p.metadata?.product_name === "string" ? p.metadata.product_name : null;
            const methodLabel = p.method === "card" ? "Card" : "Mobile money";
            return (
              <li key={p.id} className="rounded-xl border border-border bg-card px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold tracking-tight text-foreground">
                      {formatMoney(p.amount, p.currency)}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted">
                      {product ?? p.reference ?? p.id.slice(0, 8)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Mode</dt>
                    <dd className="mt-0.5 capitalize text-foreground">{p.mode}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Method</dt>
                    <dd className="mt-0.5 text-foreground">{methodLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Customer</dt>
                    <dd className="mt-0.5 truncate font-mono text-foreground">
                      {p.phone ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">When</dt>
                    <dd className="mt-0.5 text-foreground">
                      {new Date(p.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                </dl>

                {p.failure_reason ? (
                  <p className="mt-3 text-xs text-danger">{p.failure_reason}</p>
                ) : null}

                {p.status === "succeeded" || p.status === "partially_refunded" ? (
                  <div className="mt-3">
                    <Link
                      href={`/dashboard/refunds?payment=${p.id}`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Refund
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
