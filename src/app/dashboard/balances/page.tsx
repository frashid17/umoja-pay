import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { balancesFromPayments, formatMoney } from "@/lib/merchant-finance";
import type { Payment, Refund, Settlement } from "@/lib/types";

export default async function BalancesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const [{ data: payments }, { data: settlements }, { data: refunds }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, currency, status, mode")
      .eq("merchant_id", ctx.merchant.id),
    supabase
      .from("settlements")
      .select("amount, currency, status")
      .eq("merchant_id", ctx.merchant.id),
    supabase
      .from("refunds")
      .select("amount, currency, status, mode")
      .eq("merchant_id", ctx.merchant.id),
  ]);

  const paymentRows = (payments ?? []) as Pick<Payment, "amount" | "currency" | "status" | "mode">[];
  const settlementRows = (settlements ?? []) as Pick<Settlement, "amount" | "currency" | "status">[];
  const refundRows = (refunds ?? []) as Pick<Refund, "amount" | "currency" | "status" | "mode">[];

  const live = balancesFromPayments(paymentRows, settlementRows, "live", refundRows);
  const test = balancesFromPayments(paymentRows, settlementRows, "test", refundRows);

  const pendingLive = paymentRows
    .filter((p) => p.mode === "live" && (p.status === "pending" || p.status === "processing"))
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingTest = paymentRows
    .filter((p) => p.mode === "test" && (p.status === "pending" || p.status === "processing"))
    .reduce((sum, p) => sum + p.amount, 0);

  const primaryLive = live[0];
  const primaryTest = test[0];

  return (
    <AppShell
      variant="merchant"
      title="Balances"
      subtitle="Available funds from succeeded payments. Live balances settle to your destination; test balances stay in sandbox."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Live available</p>
          <p className="font-display mt-2 text-3xl font-bold text-foreground">
            {primaryLive
              ? formatMoney(primaryLive.available, primaryLive.currency)
              : formatMoney(0, "KES")}
          </p>
          <p className="mt-2 text-sm text-muted">
            Collected minus settlements reserved or paid out.
          </p>
          {live.length > 1 ? (
            <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              {live.map((b) => (
                <li key={b.currency} className="flex justify-between gap-3">
                  <span className="text-muted">{b.currency}</span>
                  <span className="font-medium text-foreground">
                    {formatMoney(b.available, b.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Test / sandbox</p>
          <p className="font-display mt-2 text-3xl font-bold text-foreground">
            {primaryTest
              ? formatMoney(primaryTest.available, primaryTest.currency)
              : formatMoney(0, "KES")}
          </p>
          <p className="mt-2 text-sm text-muted">Sandbox succeeded payments (not settleable).</p>
          {test.length > 1 ? (
            <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              {test.map((b) => (
                <li key={b.currency} className="flex justify-between gap-3">
                  <span className="text-muted">{b.currency}</span>
                  <span className="font-medium text-foreground">
                    {formatMoney(b.available, b.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Pending live</p>
          <p className="font-display mt-1 text-xl font-bold">
            {formatMoney(pendingLive, primaryLive?.currency ?? "KES")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Pending test</p>
          <p className="font-display mt-1 text-xl font-bold">
            {formatMoney(pendingTest, primaryTest?.currency ?? "KES")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Settlements</p>
          <Link
            href="/dashboard/settlements"
            className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
          >
            View payouts →
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Live breakdown</h2>
        {live.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No live collections yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {live.map((b) => (
              <li
                key={b.currency}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <span className="font-medium text-foreground">{b.currency}</span>
                <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm">
                  <div>
                    <dt className="inline text-muted">Collected </dt>
                    <dd className="inline text-foreground">{formatMoney(b.collected, b.currency)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Settled / reserved </dt>
                    <dd className="inline text-foreground">{formatMoney(b.settled, b.currency)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Refunded </dt>
                    <dd className="inline text-foreground">{formatMoney(b.refunded, b.currency)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Available </dt>
                    <dd className="inline font-semibold text-accent">
                      {formatMoney(b.available, b.currency)}
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
