"use client";

import { useEffect, useState } from "react";

const beats = [
  {
    id: "request",
    step: "01",
    eyebrow: "Checkout",
    title: "KES 15,000",
    detail: "Customer is ready to pay",
  },
  {
    id: "prompt",
    step: "02",
    eyebrow: "On their phone",
    title: "Approve payment",
    detail: "PIN prompt appears on their handset",
  },
  {
    id: "done",
    step: "03",
    eyebrow: "Settled",
    title: "Paid",
    detail: "Money is in your account",
  },
] as const;

const providers = [
  {
    name: "M-Pesa",
    markets: ["KE", "TZ"],
    logo: "/brand/providers/mpesa.png",
  },
  {
    name: "Airtel Money",
    markets: ["KE", "TZ", "UG", "RW"],
    logo: "/brand/providers/airtel.png",
  },
  {
    name: "MTN MoMo",
    markets: ["UG", "RW"],
    logo: "/brand/providers/mtn.png",
  },
  {
    name: "Tigo Pesa",
    markets: ["TZ"],
    logo: "/brand/providers/tigo.png",
  },
] as const;

const currencies = [
  { code: "KES", label: "Kenyan shilling" },
  { code: "TZS", label: "Tanzanian shilling" },
  { code: "UGX", label: "Ugandan shilling" },
  { code: "RWF", label: "Rwandan franc" },
] as const;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroPayMoment() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % beats.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const beat = beats[active];
  const paid = active === 2;

  return (
    <>
      {/* Mobile — compact story card */}
      <div className="animate-fade-up-delay-2 mt-8 lg:hidden">
        <div className="relative mx-auto h-[168px] w-full max-w-[280px]">
          <div
            className="pointer-events-none absolute inset-x-6 top-4 h-24 rounded-full bg-accent/20 blur-2xl"
            aria-hidden
          />
          <div className="relative flex h-full flex-col items-center justify-center rounded-[1.75rem] border border-border/80 bg-card/80 px-6 py-5 text-center shadow-[0_20px_50px_rgba(7,21,16,0.06)] backdrop-blur-md dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <p className="h-4 text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
              {beat.eyebrow}
            </p>
            <div className="mt-3 flex h-12 items-center justify-center gap-2">
              <span
                className={`flex items-center justify-center overflow-hidden rounded-full bg-accent text-accent-foreground transition-all duration-500 ${
                  paid ? "h-8 w-8 opacity-100" : "h-8 w-0 opacity-0"
                }`}
                aria-hidden
              >
                <CheckIcon className="h-4 w-4 shrink-0" />
              </span>
              <p className="font-display text-2xl font-bold tracking-tight text-foreground">
                {beat.title}
              </p>
            </div>
            <p className="mt-1.5 h-5 text-sm text-muted">{beat.detail}</p>
            <div className="mt-5 flex items-center gap-1.5" aria-hidden>
              {beats.map((b, i) => (
                <span
                  key={b.id}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === active
                      ? "w-5 bg-accent"
                      : i < active
                        ? "w-1.5 bg-accent/45"
                        : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-sm">
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Providers
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {providers.map((p) => (
              <li
                key={p.name}
                className="flex flex-col items-center rounded-xl border border-border bg-card/80 px-3 py-4 text-center"
              >
                <img
                  src={p.logo}
                  alt={p.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl bg-white object-contain p-1.5"
                />
                <p className="mt-3 text-sm font-medium text-foreground">{p.name}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">{p.markets.join(" · ")}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Currencies
          </p>
          <p className="mt-2 text-center font-mono text-sm text-foreground">
            {currencies.map((c) => c.code).join(" · ")}
          </p>
        </div>
      </div>

      {/* Desktop — wide story + rails */}
      <div className="animate-fade-up-delay relative hidden w-full max-w-xl justify-self-end lg:block xl:max-w-2xl">
        <div
          className="pointer-events-none absolute -inset-10 rounded-[2.5rem] bg-accent/15 blur-3xl"
          aria-hidden
        />

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_28px_80px_rgba(7,21,16,0.08)] backdrop-blur-xl dark:shadow-[0_28px_80px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              How a customer pays
            </p>
            <span className="font-mono text-[11px] text-accent">
              {String(active + 1).padStart(2, "0")} / 03
            </span>
          </div>

          <div className="px-6 py-7">
            <ol className="grid grid-cols-3 gap-3">
              {beats.map((b, i) => {
                const on = i === active;
                const done = i < active;
                return (
                  <li
                    key={b.id}
                    className={`relative flex min-h-[148px] flex-col rounded-xl border px-4 py-4 transition-all duration-500 ${
                      on
                        ? "border-accent/50 bg-accent-soft/60 shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_20%,transparent)]"
                        : done
                          ? "border-border bg-sand/40"
                          : "border-border/70 bg-background/40"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] tracking-wider ${
                        on ? "text-accent" : "text-muted"
                      }`}
                    >
                      {b.step}
                    </span>
                    <p
                      className={`mt-3 text-[10px] font-medium uppercase tracking-[0.16em] ${
                        on ? "text-accent" : "text-muted"
                      }`}
                    >
                      {b.eyebrow}
                    </p>
                    <div className="mt-2 flex min-h-[2rem] items-center gap-2">
                      {i === 2 && (on || done) ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <CheckIcon className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                      <p
                        className={`font-display text-lg font-bold leading-tight tracking-tight ${
                          on ? "text-foreground" : "text-foreground/70"
                        }`}
                      >
                        {b.title}
                      </p>
                    </div>
                    <p
                      className={`mt-auto pt-3 text-xs leading-relaxed ${
                        on ? "text-muted" : "text-muted/70"
                      }`}
                    >
                      {b.detail}
                    </p>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 space-y-6 border-t border-border pt-6">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                  Payment providers
                </p>
                <ul className="mt-3 grid grid-cols-4 gap-3">
                  {providers.map((p) => (
                    <li
                      key={p.name}
                      className="flex flex-col items-center rounded-xl border border-border bg-sand/50 px-3 py-4 text-center"
                    >
                      <span className="flex h-14 w-full items-center justify-center rounded-xl bg-white px-2 py-2">
                        <img
                          src={p.logo}
                          alt={p.name}
                          width={96}
                          height={40}
                          className="max-h-10 w-auto max-w-full object-contain"
                        />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted">
                        {p.markets.join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
                  Currencies
                </p>
                <ul className="mt-3 grid grid-cols-4 gap-3">
                  {currencies.map((c) => (
                    <li
                      key={c.code}
                      className="rounded-xl border border-border bg-sand/50 px-3 py-4 text-center"
                    >
                      <p className="font-mono text-base font-semibold text-foreground">{c.code}</p>
                      <p className="mt-1 text-[11px] leading-snug text-muted">{c.label}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
