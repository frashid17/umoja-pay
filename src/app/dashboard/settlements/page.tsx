import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import type { Settlement, SettlementAccount } from "@/lib/types";

function formatMoney(amount: number, currency: string) {
  return `${(amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function maskAccount(num: string) {
  if (num.length <= 4) return num;
  return `••••${num.slice(-4)}`;
}

export default async function SettlementsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const [{ data: settlements }, { data: account }, { data: liveSucceeded }] = await Promise.all([
    supabase
      .from("settlements")
      .select("*")
      .eq("merchant_id", ctx.merchant.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("settlement_accounts")
      .select("*")
      .eq("merchant_id", ctx.merchant.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("amount, currency")
      .eq("merchant_id", ctx.merchant.id)
      .eq("mode", "live")
      .eq("status", "succeeded"),
  ]);

  const rows = (settlements ?? []) as Settlement[];
  const destination = account as SettlementAccount | null;

  const collectedByCurrency = new Map<string, number>();
  for (const p of liveSucceeded ?? []) {
    collectedByCurrency.set(p.currency, (collectedByCurrency.get(p.currency) ?? 0) + p.amount);
  }

  const paidByCurrency = new Map<string, number>();
  for (const s of rows) {
    if (s.status === "paid" || s.status === "processing" || s.status === "pending") {
      paidByCurrency.set(s.currency, (paidByCurrency.get(s.currency) ?? 0) + s.amount);
    }
  }

  const pendingBalance = [...collectedByCurrency.entries()].map(([currency, collected]) => ({
    currency,
    amount: Math.max(0, collected - (paidByCurrency.get(currency) ?? 0)),
  }));

  const inFlight = rows
    .filter((s) => s.status === "pending" || s.status === "processing")
    .reduce((sum, s) => sum + s.amount, 0);

  const paidTotal = rows.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.amount, 0);

  const primaryCurrency = pendingBalance[0]?.currency ?? destination?.currency ?? "KES";

  return (
    <AppShell
      variant="merchant"
      title="Settlements"
      subtitle="Live collections settle to your bank or mobile money destination after reconciliation."
    >
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Available</p>
          <p className="font-display mt-1 text-2xl font-bold text-foreground">
            {pendingBalance.length === 0
              ? formatMoney(0, primaryCurrency)
              : pendingBalance
                  .map((b) => formatMoney(b.amount, b.currency))
                  .join(" · ")}
          </p>
          <p className="mt-1 text-xs text-muted">Live succeeded − settled / in flight</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">In flight</p>
          <p className="font-display mt-1 text-2xl font-bold text-foreground">
            {formatMoney(inFlight, rows[0]?.currency ?? primaryCurrency)}
          </p>
          <p className="mt-1 text-xs text-muted">Pending or processing payouts</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Paid out</p>
          <p className="font-display mt-1 text-2xl font-bold text-foreground">
            {formatMoney(paidTotal, rows.find((s) => s.status === "paid")?.currency ?? primaryCurrency)}
          </p>
          <p className="mt-1 text-xs text-muted">Successfully settled</p>
        </div>
      </div>

      <section className="mb-10 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Payout destination</h2>
            {destination ? (
              <p className="mt-2 text-sm text-foreground">
                {destination.bank_name} · {destination.account_name} ·{" "}
                {maskAccount(destination.account_number)}
                {destination.mobile_money_phone
                  ? ` · MM ${destination.mobile_money_phone}`
                  : null}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Add a bank account so we know where to send live balances.
              </p>
            )}
          </div>
          <Link
            href="/dashboard/settings"
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            {destination ? "Edit in settings" : "Add destination"}
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          Settlements run on business days after live payments clear. Test-mode charges never
          settle.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-foreground">History</h2>
        {rows.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <p className="font-display text-xl font-semibold text-foreground">No settlements yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              After you go live and collect payments, payout batches appear here with status and
              bank reference.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/settings"
                className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Set destination
              </Link>
              <Link
                href="/dashboard/payments"
                className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground"
              >
                View payments
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {rows.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted">{s.reference ?? s.id.slice(0, 12)}</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatMoney(s.amount, s.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {s.period_start} → {s.period_end}
                    {s.destination_label ? ` · ${s.destination_label}` : ""}
                  </p>
                  {s.failure_reason ? (
                    <p className="mt-1 text-xs text-danger">{s.failure_reason}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {s.paid_at ? (
                    <span className="text-xs text-muted">
                      {new Date(s.paid_at).toLocaleDateString()}
                    </span>
                  ) : null}
                  <StatusBadge status={s.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
