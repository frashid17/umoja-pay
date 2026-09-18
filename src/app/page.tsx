import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroPayMoment } from "@/components/home/hero-pay-moment";
import { LogoMark } from "@/components/brand/logo";
import { getSessionUser, getUserMerchant, isPlatformAdmin } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  const admin = user ? await isPlatformAdmin(user.id, user.email) : false;
  const merchant = user ? await getUserMerchant(user.id) : null;
  const signedIn = Boolean(user);
  const primaryHref = signedIn ? (merchant ? "/dashboard" : "/onboarding") : "/sign-up";
  const primaryLabel = signedIn
    ? merchant
      ? "Open dashboard"
      : "Finish onboarding"
    : "Create merchant account";
  const secondaryHref = signedIn ? "/dashboard/sandbox" : "/docs";
  const secondaryLabel = signedIn ? "Open sandbox" : "Read the API docs";

  return (
    <div className="min-h-screen bg-atmosphere">
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-hero text-foreground">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-signal/10 blur-3xl"
          aria-hidden
        />
        <SiteHeader isAdmin={admin} variant="over-hero" />

        <div className="relative mx-auto grid min-h-[100svh] max-w-6xl items-end gap-10 px-4 pb-14 pt-24 sm:gap-12 sm:px-6 sm:pb-16 sm:pt-28 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-24">
          <div className="max-w-xl">
            <p className="animate-fade-up mb-4 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-accent sm:mb-5 sm:tracking-[0.22em]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-signal" aria-hidden />
              East Africa payments
            </p>
            <div className="animate-fade-up flex min-w-0 items-center gap-3 sm:gap-5">
              <LogoMark className="h-11 w-11 shrink-0 sm:h-14 sm:w-14 md:h-16 md:w-16" />
              <h1 className="font-display min-w-0 text-[clamp(2.1rem,11vw,5.25rem)] font-extrabold leading-[0.95] text-foreground">
                Umoja <span className="text-accent">Pay</span>
              </h1>
            </div>
            <p className="animate-fade-up-delay mt-5 max-w-md text-[15px] leading-relaxed text-muted sm:mt-6 sm:text-base sm:text-lg">
              {signedIn
                ? "Welcome back. Continue from your dashboard, test STK in sandbox, or dig into the API docs."
                : "One API for M-Pesa-shaped payments. Merchants complete KYC, get keys, and ship checkout without rebuilding rails for every market."}
            </p>
            <div className="animate-fade-up-delay-2 mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-md bg-signal px-5 py-3 text-sm font-semibold text-[#071510] transition hover:brightness-110"
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-md border border-border bg-card/70 px-5 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition hover:border-accent/40 hover:bg-card"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>

          <HeroPayMoment />
        </div>
      </section>

      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            { label: "Markets", value: "Kenya · Tanzania · Uganda · Rwanda" },
            { label: "Currencies", value: "KES · TZS · UGX · RWF" },
            { label: "Providers", value: "M-Pesa · Airtel · MTN · Tigo" },
            { label: "Modes", value: "test → live after KYC" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {item.label}
              </p>
              <p className="mt-2 font-mono text-sm text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            How it works
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold text-foreground sm:text-4xl">
            From key to customer PIN in four steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Same payment object in sandbox and live. Confirm with webhooks; poll retrieve as backup.
          </p>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Onboard & KYC",
              body: "Create a merchant, submit documents, and stay in test mode while we review.",
            },
            {
              step: "02",
              title: "Issue API keys",
              body: "Generate uk_test_ secrets instantly. Live keys unlock after approval.",
            },
            {
              step: "03",
              title: "Create a charge",
              body: "POST amount, currency, and MSISDN. Send Idempotency-Key on every retry.",
            },
            {
              step: "04",
              title: "Settle via webhook",
              body: "Verify X-Umoja-Signature, then fulfill only on payment.succeeded.",
            },
          ].map((item) => (
            <div key={item.title} className="relative border-t border-border pt-6">
              <span className="font-display text-sm font-semibold text-signal">{item.step}</span>
              <h3 className="font-display mt-3 text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
              API surface
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Three endpoints. One mental model.
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                method: "POST",
                path: "/api/v1/payments",
                body: "Create an STK-shaped payment with idempotency and sandbox outcome overrides.",
                href: "/docs/reference/create-payment",
              },
              {
                method: "GET",
                path: "/api/v1/payments",
                body: "List recent payments for your merchant in the key’s mode.",
                href: "/docs/reference/list-payments",
              },
              {
                method: "GET",
                path: "/api/v1/payments/{id}",
                body: "Retrieve a single payment when you need a webhook backup.",
                href: "/docs/reference/retrieve-payment",
              },
            ].map((ep) => (
              <Link
                key={ep.path + ep.method}
                href={ep.href}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 transition hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ${
                      ep.method === "POST"
                        ? "bg-success/15 text-success ring-success/30"
                        : "bg-[#1d4ed8]/15 text-[#2563eb] ring-[#1d4ed8]/25 dark:text-[#60a5fa]"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <code className="font-mono text-sm text-foreground">{ep.path}</code>
                </div>
                <p className="text-sm text-muted sm:max-w-md sm:text-right">{ep.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
              Built for production
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Defensible by default
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Multi-tenant isolation, hashed secrets, signed webhooks, and audit logs — so you can
              integrate without inventing your own payment ops stack.
            </p>
            <ul className="mt-8 space-y-4 text-sm text-muted">
              {[
                "API keys hashed at rest; plaintext shown once",
                "Row-level tenant isolation in Postgres",
                "HMAC webhook signatures (X-Umoja-Signature)",
                "Idempotency keys on create to stop double charges",
                "Sandbox phone rules + outcome override headers",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
              Explore
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Keep building
            </h2>
            <div className="mt-8 space-y-3">
              {[
                {
                  href: "/docs/how-to-start",
                  title: "How to start",
                  body: "Base URL, keys, and your first sandbox charge.",
                },
                {
                  href: "/docs/webhooks",
                  title: "Webhooks",
                  body: "Verify signatures and handle payment.succeeded / failed.",
                },
                {
                  href: signedIn ? "/dashboard/sandbox" : "/docs/sandbox",
                  title: "Sandbox testing",
                  body: signedIn
                    ? "Simulate STK outcomes in your merchant console."
                    : "Phone fixtures and X-Umoja-Sandbox-Outcome.",
                },
                {
                  href: "/docs/reference",
                  title: "API reference",
                  body: "Create, list, retrieve, and payment models.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block border-t border-border py-4 transition hover:border-accent/50"
                >
                  <p className="font-display text-lg font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-sand">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {signedIn ? "Pick up where you left off." : "Ready when your checkout is."}
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              {signedIn
                ? "Dashboard, sandbox, and docs stay in sync with your merchant."
                : "Spin up a test key in minutes. No live money moves until KYC clears."}
            </p>
          </div>
          <Link
            href={primaryHref}
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            {primaryLabel}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
