import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

const countryLabels: Record<string, string> = {
  KE: "Kenya",
  TZ: "Tanzania",
  UG: "Uganda",
  RW: "Rwanda",
};

export default async function AdminHomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!(await isPlatformAdmin(user.id, user.email))) redirect("/dashboard");

  const supabase = createServiceClient();
  const [
    { count: merchantCount },
    { count: pendingKyc },
    { count: activeMerchants },
    { count: paymentCount },
    { count: succeededPayments },
    { count: failedPayments },
    { data: recentMerchants },
    { data: pendingSubs },
    { data: recentPayments },
  ] = await Promise.all([
    supabase.from("merchants").select("*", { count: "exact", head: true }),
    supabase
      .from("kyc_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("merchants")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("payments").select("*", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "succeeded"),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase.from("merchants").select("*").order("created_at", { ascending: false }).limit(6),
    supabase
      .from("kyc_submissions")
      .select("*, merchants(name, country)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("payments")
      .select("*, merchants(name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const successRate =
    (paymentCount ?? 0) > 0
      ? Math.round(((succeededPayments ?? 0) / (paymentCount ?? 1)) * 100)
      : null;

  return (
    <AppShell variant="admin">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-6 text-foreground sm:px-8 sm:py-8">
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Platform control</p>
          <h1 className="font-display mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            Operations overview
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Review KYC, watch payment volume, and keep an eye on every merchant registered on
            Umoja Pay.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-sand/30 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                Merchants
              </p>
              <p className="font-display mt-1.5 text-2xl font-bold text-foreground sm:mt-2 sm:text-3xl">
                {merchantCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted">{activeMerchants ?? 0} active</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-sand/30 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                Pending KYC
              </p>
              <p className="font-display mt-1.5 text-2xl font-bold text-signal sm:mt-2 sm:text-3xl">
                {pendingKyc ?? 0}
              </p>
              <Link href="/admin/kyc" className="mt-1 inline-block text-xs text-accent hover:underline">
                Open queue
              </Link>
            </div>
            <div className="rounded-xl border border-border/70 bg-sand/30 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                Payments
              </p>
              <p className="font-display mt-1.5 text-2xl font-bold text-foreground sm:mt-2 sm:text-3xl">
                {paymentCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted">
                {failedPayments ?? 0} failed · {succeededPayments ?? 0} ok
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-sand/30 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                Success rate
              </p>
              <p className="font-display mt-1.5 text-2xl font-bold text-foreground sm:mt-2 sm:text-3xl">
                {successRate === null ? "—" : `${successRate}%`}
              </p>
              <p className="mt-1 text-xs text-muted">Sandbox included</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              KYC needing review
            </h2>
            <Link href="/admin/kyc" className="shrink-0 text-sm font-medium text-accent hover:underline">
              Full queue
            </Link>
          </div>
          {(pendingSubs ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-sm text-muted">
              No pending submissions. New KYC requests will land here.
            </div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(pendingSubs ?? []).map((s) => {
                const merchantName =
                  s.merchants && typeof s.merchants === "object" && "name" in s.merchants
                    ? String((s.merchants as { name: string }).name)
                    : "Merchant";
                const country =
                  s.merchants && typeof s.merchants === "object" && "country" in s.merchants
                    ? String((s.merchants as { country: string }).country)
                    : s.country;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{merchantName}</p>
                      <p className="mt-1 text-muted">
                        {s.legal_name} · {countryLabels[country] ?? country}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Submitted {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href="/admin/kyc"
                      className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                    >
                      Review
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-foreground">Newest merchants</h2>
            <Link
              href="/admin/merchants"
              className="text-sm font-medium text-accent hover:underline"
            >
              All merchants
            </Link>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {(recentMerchants ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-4 text-sm">
                <div>
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="mt-1 text-muted">
                    {countryLabels[m.country] ?? m.country} ·{" "}
                    {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={m.status} />
                  <Link href={`/admin/merchants/${m.id}`} className="text-accent hover:underline">
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Live payment feed</h2>
            <p className="mt-1 text-sm text-muted">Latest charges across all merchants.</p>
          </div>
          <Link href="/admin/payments" className="text-sm font-medium text-accent hover:underline">
            Explorer
          </Link>
        </div>
        {(recentPayments ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-sm text-muted">
            No payments on the platform yet.
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {(recentPayments ?? []).map((p) => {
              const merchantName =
                p.merchants && typeof p.merchants === "object" && "name" in p.merchants
                  ? String((p.merchants as { name: string }).name)
                  : p.merchant_id.slice(0, 8);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{merchantName}</p>
                    <p className="mt-1 text-muted">
                      {(p.amount / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {p.currency} · {p.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs capitalize text-muted">{p.mode}</span>
                    <StatusBadge status={p.status} />
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
