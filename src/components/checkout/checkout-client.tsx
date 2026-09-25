"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { completeCheckoutAction, pollCheckoutPaymentAction } from "@/app/checkout/actions";
import {
  cvcLength,
  detectCardBrand,
  formatCardNumber,
  type CardBrand,
} from "@/lib/checkout/card-brand";
import {
  CalendarIcon,
  CardBrandMark,
  CardIcon,
  CheckIcon,
  LockIcon,
  PhoneIcon,
  ShieldIcon,
  UserIcon,
  XIcon,
} from "@/components/checkout/checkout-icons";
import type { CheckoutSession, CurrencyCode } from "@/lib/types";

type MerchantBrand = {
  id: string;
  name: string;
  logoUrl: string | null;
  brandAccent: string | null;
  supportEmail: string | null;
};

type Props = {
  session: CheckoutSession;
  merchant: MerchantBrand;
  preview?: boolean;
  paystackEnabled?: boolean;
};

type PayMethod = "mpesa_stk" | "card";
type Phase = "form" | "processing" | "awaiting" | "success" | "error";

function formatMoney(amount: number, currency: CurrencyCode) {
  return `${(amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function brandLabel(brand: CardBrand) {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "Amex";
    case "discover":
      return "Discover";
    default:
      return null;
  }
}

function useMaskedDigits(value: string, revealMs = 700) {
  const [visibleTail, setVisibleTail] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!value) {
      setVisibleTail(false);
      return;
    }
    setVisibleTail(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisibleTail(false), revealMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, revealMs]);

  const display =
    value.length === 0
      ? ""
      : visibleTail
        ? `${"•".repeat(Math.max(0, value.length - 1))}${value.slice(-1)}`
        : "•".repeat(value.length);

  return display;
}

export function CheckoutClient({ session, merchant, preview, paystackEnabled }: Props) {
  const accent = merchant.brandAccent?.trim() || "var(--accent)";
  const [method, setMethod] = useState<PayMethod>("mpesa_stk");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [awaitMessage, setAwaitMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [fieldsKey, setFieldsKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const cvcDisplay = useMaskedDigits(cvc);
  const pollRef = useRef<number | null>(null);

  const brand = detectCardBrand(cardNumber);
  const maxCvc = cvcLength(brand);
  const last4 = cardNumber.replace(/\D/g, "").slice(-4);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setFieldsKey((k) => k + 1);
  }, [method]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function switchMethod(next: PayMethod) {
    if (next === method || pending || phase === "processing" || phase === "awaiting") return;
    setMethod(next);
  }

  function startPolling(id: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      void (async () => {
        const res = await pollCheckoutPaymentAction(id);
        if (res.status === "succeeded") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setPhase("success");
        } else if (res.status === "failed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setError(res.failureReason ?? "Payment failed");
          setPhase("error");
        }
      })();
    }, 2500);
  }

  async function openPaystackPopup(opts: {
    publicKey: string;
    email: string;
    amount: number;
    currency: string;
    ref: string;
    accessCode?: string;
  }) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector("script[data-paystack]");
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.dataset.paystack = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Paystack"));
      document.body.appendChild(script);
    });

    type PaystackPop = {
      setup: (cfg: Record<string, unknown>) => { openIframe: () => void };
    };
    const PaystackPop = (window as unknown as { PaystackPop?: PaystackPop }).PaystackPop;
    if (!PaystackPop) throw new Error("Paystack unavailable");

    await new Promise<void>((resolve, reject) => {
      const handler = PaystackPop.setup({
        key: opts.publicKey,
        email: opts.email,
        amount: opts.amount,
        currency: opts.currency,
        ref: opts.ref,
        ...(opts.accessCode ? { access_code: opts.accessCode } : {}),
        callback: () => {
          resolve();
        },
        onClose: () => {
          reject(new Error("Payment window closed"));
        },
      });
      handler.openIframe();
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) {
      setPhase("processing");
      window.setTimeout(() => {
        setPhase("success");
        setPaymentId("preview_payment");
      }, 900);
      return;
    }

    setError(null);
    setPhase("processing");

    const fd = new FormData();
    fd.set("sessionId", session.id);
    fd.set("method", method);
    if (email) fd.set("email", email);
    if (method === "mpesa_stk") fd.set("phone", phone);
    if (method === "card" && !paystackEnabled) {
      fd.set("cardName", cardName);
      fd.set("cardNumber", cardNumber.replace(/\s/g, ""));
      fd.set("expiry", expiry);
      fd.set("cvc", cvc);
    }

    startTransition(async () => {
      const result = await completeCheckoutAction(fd);
      if (!result.ok) {
        setError(result.error);
        setPhase("error");
        return;
      }

      setPaymentId(result.paymentId);

      if (result.status === "succeeded") {
        setPhase("success");
        return;
      }

      if (method === "card" && paystackEnabled && result.publicKey) {
        try {
          if (result.authorizationUrl && !result.accessCode) {
            window.location.href = result.authorizationUrl;
            return;
          }
          await openPaystackPopup({
            publicKey: result.publicKey,
            email: email,
            amount: session.amount,
            currency: session.currency,
            ref: result.paymentId,
            accessCode: result.accessCode,
          });
          setAwaitMessage("Confirming your card payment…");
          setPhase("awaiting");
          startPolling(result.paymentId);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Card payment cancelled");
          setPhase("error");
        }
        return;
      }

      if (result.status === "processing") {
        setAwaitMessage(
          result.displayText ||
            (method === "mpesa_stk"
              ? "Check your phone and enter your M-Pesa PIN."
              : "Complete payment to continue."),
        );
        setPhase("awaiting");
        startPolling(result.paymentId);
        return;
      }

      setPhase("success");
    });
  }

  const busy = pending || phase === "processing" || phase === "awaiting";

  return (
    <div
      className="relative flex min-h-svh flex-col justify-center overflow-hidden px-3 py-4 sm:px-4"
      style={{ "--checkout-accent": accent } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 bg-atmosphere" />
      <div
        className="checkout-glow pointer-events-none absolute left-1/2 top-[-18%] h-[280px] w-[420px] -translate-x-1/2 rounded-full opacity-35 blur-3xl"
        style={{ background: "var(--checkout-accent)" }}
      />

      <div
        className={`relative mx-auto w-full max-w-md transition-all duration-500 ease-out ${
          entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {preview ? (
          <p className="mb-2 text-center text-[10px] font-medium tracking-wide text-muted">
            Preview · no real charge
          </p>
        ) : null}

        <section className="rounded-2xl border border-border/90 bg-card/95 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.4)] backdrop-blur-md">
          {phase === "form" || phase === "processing" ? (
            <>
              <div className="flex items-center gap-3 border-b border-border px-3.5 py-3 sm:px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                  {merchant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={merchant.logoUrl}
                      alt={merchant.name}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span
                      className="font-display text-sm font-bold"
                      style={{ color: "var(--checkout-accent)" }}
                    >
                      {merchant.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {merchant.name}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {session.description ?? "Secure checkout"}
                    {session.reference ? ` · ${session.reference}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted">
                    Due
                  </p>
                  <p className="font-display text-lg font-bold leading-tight tracking-tight text-foreground">
                    {formatMoney(session.amount, session.currency)}
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="flex flex-col gap-3 px-3.5 py-3 sm:px-4 sm:pb-4">
                <div
                  role="tablist"
                  aria-label="Payment method"
                  className="grid grid-cols-2 gap-1 rounded-xl bg-sand/60 p-0.5"
                >
                  {(
                    [
                      { id: "mpesa_stk" as const, label: "Mobile money", Icon: PhoneIcon },
                      { id: "card" as const, label: "Card", Icon: CardIcon },
                    ] as const
                  ).map((opt) => {
                    const active = method === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={busy}
                        onClick={() => switchMethod(opt.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold transition ${
                          active
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        <opt.Icon
                          className={`h-3.5 w-3.5 ${active ? "text-[color:var(--checkout-accent)]" : ""}`}
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div key={fieldsKey} className="animate-checkout-swap flex flex-col gap-2.5">
                  {(method === "card" && paystackEnabled) || method === "mpesa_stk" ? (
                    <label className="block space-y-1 text-sm">
                      <span className="text-[12px] font-medium text-foreground">
                        Email {method === "card" && paystackEnabled ? "" : "(optional)"}
                      </span>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        required={Boolean(method === "card" && paystackEnabled)}
                        disabled={busy}
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="checkout-input w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none"
                      />
                    </label>
                  ) : null}

                  {method === "mpesa_stk" ? (
                    <label className="block space-y-1 text-sm">
                      <span className="text-[12px] font-medium text-foreground">Phone</span>
                      <div className="relative">
                        <PhoneIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                        <input
                          value={phone}
                          onChange={(e) =>
                            setPhone(e.target.value.replace(/[^\d+]/g, "").slice(0, 15))
                          }
                          inputMode="tel"
                          required
                          disabled={busy}
                          placeholder="2547XXXXXXXX"
                          className="checkout-input w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 font-mono text-sm outline-none"
                        />
                      </div>
                      {paystackEnabled ? (
                        <span className="text-[11px] text-muted">
                          You’ll get an M-Pesa STK prompt on this number (Paystack).
                        </span>
                      ) : null}
                    </label>
                  ) : paystackEnabled ? (
                    <p className="rounded-lg border border-border bg-sand/40 px-3 py-2.5 text-[12px] text-muted">
                      Card details are entered securely on Paystack — we never see your full card
                      number.
                    </p>
                  ) : (
                    <>
                      <div
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-white"
                        style={{
                          background: `linear-gradient(120deg, color-mix(in oklab, var(--checkout-accent) 85%, black), var(--checkout-accent))`,
                        }}
                      >
                        <CardBrandMark
                          brand={brand}
                          className={`h-4 w-auto max-w-[3.25rem] transition ${
                            brand !== "unknown" ? "opacity-100" : "opacity-50"
                          }`}
                        />
                        <p className="min-w-0 flex-1 truncate font-mono text-[12px] tracking-wider text-white/95">
                          {cardNumber || "•••• •••• •••• ••••"}
                        </p>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/70">
                          {brandLabel(brand) ?? "Card"}
                        </span>
                      </div>

                      <label className="block space-y-1 text-sm">
                        <span className="text-[12px] font-medium text-foreground">Name</span>
                        <div className="relative">
                          <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                          <input
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            required
                            disabled={busy}
                            autoComplete="cc-name"
                            placeholder="Name on card"
                            className="checkout-input w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none"
                          />
                        </div>
                      </label>

                      <label className="block space-y-1 text-sm">
                        <span className="text-[12px] font-medium text-foreground">Number</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
                            <CardBrandMark brand={brand} className="h-3.5 w-auto max-w-[2.25rem]" />
                          </span>
                          <input
                            value={cardNumber}
                            onChange={(e) => {
                              const nextBrand = detectCardBrand(e.target.value);
                              setCardNumber(formatCardNumber(e.target.value, nextBrand));
                              if (cvc.length > cvcLength(nextBrand)) {
                                setCvc(cvc.slice(0, cvcLength(nextBrand)));
                              }
                            }}
                            inputMode="numeric"
                            required
                            disabled={busy}
                            autoComplete="cc-number"
                            placeholder="4242 4242 4242 4242"
                            className="checkout-input w-full rounded-lg border border-border bg-background py-2.5 pl-11 pr-3 font-mono text-sm outline-none"
                          />
                        </div>
                      </label>

                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="block space-y-1 text-sm">
                          <span className="text-[12px] font-medium text-foreground">Expiry</span>
                          <div className="relative">
                            <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                            <input
                              value={expiry}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                              }}
                              required
                              disabled={busy}
                              autoComplete="cc-exp"
                              placeholder="MM/YY"
                              className="checkout-input w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-2 font-mono text-sm outline-none"
                            />
                          </div>
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-[12px] font-medium text-foreground">CVC</span>
                          <div className="relative">
                            <LockIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                            <div
                              aria-hidden
                              className="pointer-events-none absolute inset-0 flex items-center py-2.5 pl-9 pr-2 font-mono text-sm tracking-[0.3em] text-foreground"
                            >
                              {cvcDisplay || (
                                <span className="tracking-normal text-muted/45">
                                  {"•".repeat(maxCvc)}
                                </span>
                              )}
                            </div>
                            <input
                              value={cvc}
                              onChange={(e) =>
                                setCvc(e.target.value.replace(/\D/g, "").slice(0, maxCvc))
                              }
                              inputMode="numeric"
                              required
                              disabled={busy}
                              autoComplete="cc-csc"
                              maxLength={maxCvc}
                              aria-label="CVC"
                              className="checkout-input relative w-full rounded-lg border border-border bg-transparent py-2.5 pl-9 pr-2 font-mono text-sm tracking-[0.3em] text-transparent caret-foreground outline-none"
                            />
                          </div>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="checkout-pay-btn group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-70"
                  style={{ background: "var(--checkout-accent)" }}
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-checkout-sheen" />
                  {phase === "processing" ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                      Processing…
                    </span>
                  ) : (
                    <>
                      <LockIcon className="h-3.5 w-3.5 opacity-90" />
                      Pay {formatMoney(session.amount, session.currency)}
                    </>
                  )}
                </button>
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted">
                  <ShieldIcon className="h-3 w-3" />
                  Encrypted · {paystackEnabled ? "Paystack · " : ""}powered by{" "}
                  <Link
                    href="/"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    Umoja Pay
                  </Link>
                </p>
              </form>
            </>
          ) : null}

          {phase === "awaiting" ? (
            <div className="flex flex-col items-center px-5 py-8 text-center animate-checkout-pop">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-[color:var(--checkout-accent)]" />
              <h2 className="font-display mt-4 text-xl font-bold text-foreground">
                Waiting for payment
              </h2>
              <p className="mt-1.5 max-w-xs text-sm text-muted">
                {awaitMessage ?? "Complete authorization on your phone or card window."}
              </p>
              {paymentId ? (
                <p className="mt-2 font-mono text-[10px] text-muted">{paymentId}</p>
              ) : null}
            </div>
          ) : null}

          {phase === "success" ? (
            <div className="flex flex-col items-center px-5 py-8 text-center animate-checkout-pop">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--checkout-accent) 16%, transparent)",
                  color: "var(--checkout-accent)",
                }}
              >
                <CheckIcon className="h-7 w-7" />
              </div>
              <h2 className="font-display mt-4 text-xl font-bold text-foreground">You’re paid up</h2>
              <p className="mt-1.5 text-sm text-muted">
                {formatMoney(session.amount, session.currency)}
                {method === "card" && last4 ? ` · •••• ${last4}` : ""}
              </p>
              {paymentId && !preview ? (
                <p className="mt-2 font-mono text-[10px] text-muted">{paymentId}</p>
              ) : null}
              {session.success_url && !preview ? (
                <a
                  href={session.success_url}
                  className="mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: "var(--checkout-accent)" }}
                >
                  Continue
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("form");
                    setError(null);
                  }}
                  className="mt-5 text-sm text-muted hover:text-foreground"
                >
                  {preview ? "Reset preview" : "Close"}
                </button>
              )}
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="flex flex-col items-center px-5 py-8 text-center animate-checkout-pop">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/12 text-danger">
                <XIcon className="h-7 w-7" />
              </div>
              <h2 className="font-display mt-4 text-xl font-bold text-foreground">
                Payment didn’t go through
              </h2>
              <p className="mt-1.5 text-sm text-muted">{error ?? "Try again."}</p>
              <button
                type="button"
                onClick={() => {
                  setPhase("form");
                  setError(null);
                }}
                className="mt-5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground"
              >
                Try again
              </button>
            </div>
          ) : null}
        </section>

        {merchant.supportEmail ? (
          <p className="mt-2 text-center text-[10px] text-muted">
            Support · {merchant.supportEmail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
