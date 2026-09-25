import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { customersFromPayments, formatMoney } from "@/lib/merchant-finance";
import type { Payment } from "@/lib/types";

export default async function CustomersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, phone, amount, currency, status, created_at, metadata, method")
    .eq("merchant_id", ctx.merchant.id)
    .order("created_at", { ascending: false })
    .limit(2000);

  const customers = customersFromPayments(
    (payments ?? []) as Pick<
      Payment,
      "id" | "phone" | "amount" | "currency" | "status" | "created_at" | "metadata" | "method"
    >[],
  );

  const withSuccess = customers.filter((c) => c.succeededCount > 0);

  return (
    <AppShell
      variant="merchant"
      title="Customers"
      subtitle="People who have paid on your platform — grouped by phone for mobile money, or as card payers."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
            Customers
          </p>
          <p className="font-display mt-1 text-2xl font-bold">{customers.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
            With successful pay
          </p>
          <p className="font-display mt-1 text-2xl font-bold">{withSuccess.length}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-border bg-card px-3 py-3 sm:col-span-1 sm:px-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
            Transactions
          </p>
          <Link
            href="/dashboard/transactions"
            className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
          >
            Open ledger →
          </Link>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-display text-xl font-semibold text-foreground">No customers yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            When someone pays via checkout, payment links, or your API, they show up here.
          </p>
          <Link
            href="/dashboard/payment-links"
            className="mt-6 inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Create a payment link
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {customers.map((c) => (
            <li key={c.key} className="rounded-xl border border-border bg-card px-4 py-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-foreground">{c.label}</p>
                  <p className="mt-1 text-xs text-muted">
                    {c.succeededCount} successful · {c.paymentCount} total attempt
                    {c.paymentCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  {c.totals.length === 0 ? (
                    <p className="text-xs text-muted">No successful pay</p>
                  ) : (
                    c.totals.map((t) => (
                      <p key={t.currency} className="font-display text-base font-bold text-foreground">
                        {formatMoney(t.amount, t.currency)}
                      </p>
                    ))
                  )}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                <div>
                  <dt className="text-muted">First seen</dt>
                  <dd className="mt-0.5 text-foreground">
                    {new Date(c.firstSeenAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Last paid</dt>
                  <dd className="mt-0.5 text-foreground">
                    {c.lastPaidAt
                      ? new Date(c.lastPaidAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
