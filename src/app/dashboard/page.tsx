import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import type { MerchantStatus } from "@/lib/types";

const countryLabels: Record<string, string> = {
  KE: "Kenya",
  TZ: "Tanzania",
  UG: "Uganda",
  RW: "Rwanda",
};

function nextStep(status: MerchantStatus) {
  if (status === "draft" || status === "rejected") {
    return {
      body: "Submit business details and a registration document. Test mode stays available while we review.",
      href: "/dashboard/kyc",
      cta: "Start KYC",
    };
  }
  if (status === "pending_kyc") {
    return {
      body: "We usually review within one business day. You can keep building against sandbox keys in the meantime.",
      href: "/dashboard/keys",
      cta: "Manage test keys",
    };
  }
  if (status === "active") {
    return {
      body: "Create a live API key and point your checkout at production when you are ready.",
      href: "/dashboard/keys",
      cta: "Create live key",
    };
  }
  return {
    body: "Contact support if you believe this is an error.",
    href: "/docs",
    cta: "Read docs",
  };
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const [
    { count: paymentCount },
    { data: recentPayments },
    { count: keyCount },
    { count: succeededCount },
    { count: failedCount },
    { data: webhooks },
    { data: keysPreview },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", ctx.merchant.id),
    supabase
      .from("payments")
      .select("*")
      .eq("merchant_id", ctx.merchant.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", ctx.merchant.id)
      .is("revoked_at", null),
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
      .from("webhook_endpoints")
      .select("*")
      .eq("merchant_id", ctx.merchant.id),
    supabase
      .from("api_keys")
      .select("id, name, prefix, mode, last_used_at, revoked_at, created_at")
      .eq("merchant_id", ctx.merchant.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const step = nextStep(ctx.merchant.status);
  const modeLabel = ctx.merchant.status === "active" ? "Live ready" : "Test mode";
  const shortId = ctx.merchant.id.slice(0, 8);

  return (
    <AppShell variant="merchant">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-6 text-foreground sm:px-8 sm:py-10">
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={ctx.merchant.status} />
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
                {countryLabels[ctx.merchant.country] ?? ctx.merchant.country}
              </span>
            </div>
            <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              {ctx.merchant.name}
            </h1>
            <p className="mt-3 font-mono text-xs text-muted">merchant_{shortId}</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">{step.body}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={step.href}
                className="rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-[#071510] transition hover:brightness-110"
              >
                {step.cta}
              </Link>
              <Link
                href="/docs"
                className="rounded-md border border-border bg-sand/60 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/40"
              >
                Integration guide
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 border-t border-border pt-6 sm:gap-6 lg:min-w-[220px] lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                Keys
              </dt>
              <dd className="font-display mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {keyCount ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                Payments
              </dt>
              <dd className="font-display mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {paymentCount ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
                Mode
              </dt>
              <dd className="font-display mt-2 text-lg font-bold leading-7 text-foreground sm:text-2xl sm:leading-8">
                {modeLabel}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Balances",
            value: "Live & test",
            detail: "Available funds by currency",
            href: "/dashboard/balances",
          },
          {
            label: "Transactions",
            value: String(paymentCount ?? 0),
            detail: `${succeededCount ?? 0} succeeded · ${failedCount ?? 0} failed`,
            href: "/dashboard/transactions",
          },
          {
            label: "Customers",
            value: "Payers",
            detail: "Who paid on your platform",
            href: "/dashboard/customers",
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-border bg-card px-5 py-4 transition hover:border-accent/40"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{item.label}</p>
            <p className="font-display mt-2 text-2xl font-bold text-foreground">{item.value}</p>
            <p className="mt-1 truncate text-xs text-muted">{item.detail}</p>
          </Link>
        ))}
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "API keys",
            value: String(keyCount ?? 0),
            detail:
              keysPreview && keysPreview.length > 0
                ? `${keysPreview[0].prefix}… · ${keysPreview[0].mode}`
                : "None created yet",
            href: "/dashboard/keys",
          },
          {
            label: "Payment outcomes",
            value: `${succeededCount ?? 0}/${failedCount ?? 0}`,
            detail: "Succeeded / failed",
            href: "/dashboard/payments",
          },
          {
            label: "Webhooks",
            value: String(webhooks?.length ?? 0),
            detail:
              webhooks && webhooks.length > 0
                ? `${webhooks[0].url.replace(/^https?:\/\//, "").slice(0, 28)}…`
                : "Not configured",
            href: "/dashboard/webhooks",
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-border bg-card px-5 py-4 transition hover:border-accent/40"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{item.label}</p>
            <p className="font-display mt-2 text-2xl font-bold text-foreground">{item.value}</p>
            <p className="mt-1 truncate text-xs text-muted">{item.detail}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-foreground">Get to first payment</h2>
            <span className="text-xs text-muted">{succeededCount ?? 0} succeeded</span>
          </div>
          <ol className="mt-6 space-y-0">
            {[
              {
                n: "01",
                title: "Create a test key",
                body: "Generate uk_test_… from API keys. Secrets are shown once.",
                href: "/dashboard/keys",
              },
              {
                n: "02",
                title: "Charge a sandbox STK",
                body: "Use the Sandbox console or POST /api/v1/payments with a test key.",
                href: "/dashboard/sandbox",
              },
              {
                n: "03",
                title: "Watch webhooks",
                body: "Point an endpoint at payment.succeeded / payment.failed events.",
                href: "/dashboard/webhooks",
              },
            ].map((item, i) => (
              <li
                key={item.n}
                className={`group flex gap-4 border-t border-border py-5 ${i === 0 ? "border-t-0 pt-0" : ""}`}
              >
                <span className="font-display w-8 shrink-0 text-sm font-semibold text-signal">
                  {item.n}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    className="font-display text-lg font-semibold text-foreground transition group-hover:text-accent"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-sand text-foreground shadow-[0_20px_50px_rgba(7,21,16,0.06)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-[11px] text-muted">curl · sandbox</span>
            <span className="text-[11px] text-signal">test</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-6 text-foreground sm:text-xs">
            <code>{`curl $BASE/api/v1/payments \\
  -H "Authorization: Bearer uk_test_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 15000,
    "currency": "KES",
    "method": "mpesa_stk",
    "phone": "254712345678"
  }'`}</code>
          </pre>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Recent activity</h2>
            <p className="mt-1 text-sm text-muted">Latest payments created with your API keys.</p>
          </div>
          <Link href="/dashboard/payments" className="text-sm font-medium text-accent hover:underline">
            View all
          </Link>
        </div>

        {(recentPayments ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <p className="font-display text-xl font-semibold text-foreground">No payments yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Create a test key, then fire the curl snippet above. Phone numbers ending in 0 fail in
              sandbox — everything else succeeds.
            </p>
            <Link
              href="/dashboard/sandbox"
              className="mt-6 inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
            >
              Open sandbox
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {(recentPayments ?? []).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted">{p.id.slice(0, 13)}…</p>
                  <p className="mt-1 font-medium text-foreground">
                    {(p.amount / 100).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {p.currency}
                    <span className="ml-2 font-normal text-muted">{p.phone}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs capitalize text-muted">{p.mode}</span>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
