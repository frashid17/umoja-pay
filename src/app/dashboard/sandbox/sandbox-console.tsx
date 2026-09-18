"use client";

import { useState, useTransition } from "react";
import { runSandboxPaymentAction } from "@/app/dashboard/sandbox/actions";
import type { CurrencyCode } from "@/lib/types";

const fixtures = [
  { label: "Succeed (…678)", phone: "254712345678", outcome: "auto" as const },
  { label: "Fail (ends 0)", phone: "254700000000", outcome: "auto" as const },
  { label: "Force success", phone: "254712345678", outcome: "succeeded" as const },
  { label: "Force fail", phone: "254712345678", outcome: "failed" as const },
];

export function SandboxConsole({ appUrl }: { appUrl: string }) {
  const [amount, setAmount] = useState("15000");
  const [currency, setCurrency] = useState<CurrencyCode>("KES");
  const [phone, setPhone] = useState("254712345678");
  const [reference, setReference] = useState("");
  const [outcome, setOutcome] = useState<"auto" | "succeeded" | "failed">("auto");
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function applyFixture(fixture: (typeof fixtures)[number]) {
    setPhone(fixture.phone);
    setOutcome(fixture.outcome);
    setError(null);
  }

  async function copyResponse() {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResponse(null);

    const parsedAmount = Number(amount);
    startTransition(async () => {
      const result = await runSandboxPaymentAction({
        amount: parsedAmount,
        currency,
        phone,
        reference: reference || undefined,
        outcome,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setResponse(JSON.stringify(result.payment, null, 2));
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Simulate STK Push</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Runs against your merchant in <span className="font-medium text-foreground">test</span>{" "}
            mode only. No live money.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {fixtures.map((fixture) => (
            <button
              key={fixture.label}
              type="button"
              onClick={() => applyFixture(fixture)}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs leading-snug text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              {fixture.label}
            </button>
          ))}
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-muted">Amount (minor units)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-muted">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="KES">KES</option>
            <option value="TZS">TZS</option>
            <option value="UGX">UGX</option>
            <option value="RWF">RWF</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-muted">Phone (MSISDN)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-muted">Reference (optional)</span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="order_123"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-muted">Sandbox outcome</span>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as typeof outcome)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="auto">Auto (phone ends with 0 → fail)</option>
            <option value="succeeded">Force succeeded</option>
            <option value="failed">Force failed</option>
          </select>
        </label>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Simulating…" : "Run sandbox payment"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Environment</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-muted">Mode</dt>
              <dd className="font-mono text-foreground sm:text-right">test</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-muted">API base</dt>
              <dd className="break-all font-mono text-xs text-foreground sm:text-right">
                {appUrl}/api/v1
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-muted">Method</dt>
              <dd className="font-mono text-foreground sm:text-right">mpesa_stk</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="shrink-0 text-muted">Override header</dt>
              <dd className="break-all font-mono text-xs text-foreground sm:text-right">
                X-Umoja-Sandbox-Outcome
              </dd>
            </div>
          </dl>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-sand">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="font-mono text-[11px] text-muted">Last response</span>
            {response ? (
              <button
                type="button"
                onClick={copyResponse}
                className="rounded-md px-2 py-1 font-mono text-[11px] text-muted transition hover:bg-card hover:text-foreground"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>
          <pre className="max-h-[420px] max-w-full overflow-auto p-4 font-mono text-[12px] leading-6 break-words whitespace-pre-wrap text-foreground sm:whitespace-pre sm:break-normal">
            {response ?? "// Run a payment to see the JSON response here"}
          </pre>
        </div>
      </div>
    </div>
  );
}
