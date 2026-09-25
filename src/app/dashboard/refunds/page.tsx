import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { CreateRefundForm, EditRefundForm } from "@/components/refunds/refund-forms";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { formatMoney } from "@/lib/merchant-finance";
import { getRefundableRemaining, listRefunds } from "@/lib/payments/refunds";
import type { Payment, Refund } from "@/lib/types";

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const sp = await searchParams;
  const refunds = await listRefunds(ctx.merchant.id, 50);

  let refundTarget: {
    payment: Payment;
    remaining: number;
  } | null = null;

  if (sp.payment) {
    const info = await getRefundableRemaining(sp.payment, ctx.merchant.id);
    if (info && info.remaining > 0) {
      refundTarget = { payment: info.payment, remaining: info.remaining };
    }
  }

  const supabase = createServiceClient();
  const paymentIds = [...new Set(refunds.map((r) => r.payment_id))];
  const paymentMap = new Map<string, Payment>();
  if (paymentIds.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("merchant_id", ctx.merchant.id)
      .in("id", paymentIds);
    for (const p of (data ?? []) as Payment[]) paymentMap.set(p.id, p);
  }

  // Refundable payments for quick pick
  const { data: refundablePayments } = await supabase
    .from("payments")
    .select("*")
    .eq("merchant_id", ctx.merchant.id)
    .in("status", ["succeeded", "partially_refunded"])
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <AppShell
      variant="merchant"
      title="Refunds"
      subtitle="Full or partial refunds settle back to the customer’s original mobile money or card."
    >
      {refundTarget ? (
        <section className="mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-foreground">New refund</h2>
          <p className="mt-1 text-sm text-muted">
            Payment {refundTarget.payment.id.slice(0, 8)}… ·{" "}
            {formatMoney(refundTarget.payment.amount, refundTarget.payment.currency)} ·{" "}
            {formatMoney(refundTarget.remaining, refundTarget.payment.currency)} remaining
          </p>
          <div className="mt-4">
            <CreateRefundForm payment={refundTarget.payment} remainingMinor={refundTarget.remaining} />
          </div>
        </section>
      ) : (
        <section className="mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-foreground">Issue a refund</h2>
          <p className="mt-1 text-sm text-muted">
            Choose a succeeded payment, or open Refund from the transactions list.
          </p>
          {(refundablePayments ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted">No refundable payments yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {((refundablePayments ?? []) as Payment[]).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/refunds?payment=${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 text-sm transition hover:border-accent/40"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-foreground">
                        {formatMoney(p.amount, p.currency)}
                      </span>
                      <span className="ml-2 text-muted">
                        {p.method === "card" ? "Card" : p.phone ?? "MoMo"} · {p.mode}
                      </span>
                    </span>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="font-display text-xl font-bold text-foreground">Refund history</h2>
        {refunds.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <p className="font-display text-xl font-semibold text-foreground">No refunds yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Refunds appear here after you issue them from a succeeded payment.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {refunds.map((r) => {
              const payment = paymentMap.get(r.payment_id);
              const dest =
                r.method === "card"
                  ? `Card ••••${
                      typeof r.metadata?.destination === "object" &&
                      r.metadata.destination &&
                      "last4" in (r.metadata.destination as object) &&
                      typeof (r.metadata.destination as { last4?: unknown }).last4 === "string"
                        ? (r.metadata.destination as { last4: string }).last4
                        : "****"
                    }`
                  : `MoMo ${payment?.phone ?? "—"}`;

              return (
                <li key={r.id} className="rounded-xl border border-border bg-card px-4 py-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold text-foreground">
                        {formatMoney(r.amount, r.currency)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        → {dest} · payment {r.payment_id.slice(0, 8)}…
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.reason ? <p className="mt-2 text-xs text-muted">Reason: {r.reason}</p> : null}
                  {r.failure_reason ? (
                    <p className="mt-2 text-xs text-danger">{r.failure_reason}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">
                    {new Date(r.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <div className="mt-4 border-t border-border pt-4">
                    <EditRefundForm refund={r as Refund} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
