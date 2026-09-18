import Link from "next/link";
import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function SandboxPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Guides"
        title="Sandbox testing"
        lead="Sandbox simulates STK outcomes so you can test success and failure without real M-Pesa prompts. Use a uk_test_ key, or the merchant Sandbox console."
      />

      <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
        <p className="font-display text-base font-semibold text-foreground">Prefer a UI?</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Open the merchant{" "}
          <Link href="/dashboard/sandbox" className="font-medium text-accent hover:underline">
            Sandbox console
          </Link>{" "}
          to simulate payments, force outcomes, and inspect JSON responses without writing curl.
        </p>
      </div>

      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-muted">
        <p>
          The sandbox M-Pesa adapter short-circuits the network: it waits briefly, then settles the
          payment to <InlineCode>succeeded</InlineCode> or <InlineCode>failed</InlineCode> and fires
          your webhook. All sandbox traffic is <InlineCode>mode: test</InlineCode>.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          Deterministic phone rules
        </h2>
        <p>
          If you do not send an override header, the last digit of the MSISDN decides the outcome:
        </p>
        <SimpleTable
          headers={["Phone ends with", "Outcome"]}
          rows={[
            ["0", "failed (customer declined / insufficient funds)"],
            ["1–9", "succeeded"],
          ]}
        />
        <CodeBlock title="Fail fixture">{`curl -X POST "$BASE_URL/api/v1/payments" \\
  -H "Authorization: Bearer uk_test_…" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: sandbox-fail-0" \\
  -d '{
    "amount": 100,
    "currency": "KES",
    "method": "mpesa_stk",
    "phone": "254700000000"
  }'`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          Outcome override header
        </h2>
        <p>
          Force a result regardless of phone number with{" "}
          <InlineCode>X-Umoja-Sandbox-Outcome</InlineCode>:
        </p>
        <CodeBlock title="Override to failed">{`curl -X POST "$BASE_URL/api/v1/payments" \\
  -H "Authorization: Bearer uk_test_…" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: sandbox-fail-1" \\
  -H "X-Umoja-Sandbox-Outcome: failed" \\
  -d '{
    "amount": 100,
    "currency": "KES",
    "method": "mpesa_stk",
    "phone": "254712345678"
  }'`}</CodeBlock>
        <p>
          Allowed values: <InlineCode>succeeded</InlineCode> | <InlineCode>failed</InlineCode>. The
          header is ignored for live keys.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">What to verify</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create + settle path ends in a terminal status.</li>
          <li>
            Webhook <InlineCode>X-Umoja-Event</InlineCode> matches{" "}
            <InlineCode>payment.succeeded</InlineCode> or <InlineCode>payment.failed</InlineCode>.
          </li>
          <li>
            Retrieve matches the webhook payload for <InlineCode>id</InlineCode> and{" "}
            <InlineCode>status</InlineCode>.
          </li>
          <li>Same <InlineCode>Idempotency-Key</InlineCode> returns the same payment.</li>
          <li>Invalid keys → 401; live key before KYC → 403.</li>
        </ul>
      </div>

      <DocsPager
        prev={{ href: "/docs/webhooks", label: "Webhooks" }}
        next={{ href: "/docs/errors", label: "Errors & codes" }}
      />
    </div>
  );
}
