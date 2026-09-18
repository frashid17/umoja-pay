import {
  CodeBlock,
  DocCard,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function DocsWelcomePage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Umoja Pay Merchant API"
        title="Welcome"
        lead="Get paid with mobile money in East Africa. One STK-shaped API for merchants — sandbox first, live after KYC, same objects in both modes."
      />

      <h2 className="font-display text-xl font-semibold text-foreground">Learn more</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DocCard
          href="/docs/mobile-money"
          title="About mobile money"
          description="How STK Push differs from cards, and what your customers experience on their phone."
        />
        <DocCard
          href="/docs/what-to-know"
          title="What you should know"
          description="Async payments, idempotency, minor units, and MSISDN formatting."
        />
        <DocCard
          href="/docs/how-to-start"
          title="How to start"
          description="Base URL, dashboard, API keys, and your first sandbox charge."
        />
        <DocCard
          href="/docs/going-live"
          title="Going live"
          description="KYC approval, live keys, and switching environments safely."
        />
      </div>

      <h2 className="font-display mt-10 text-xl font-semibold text-foreground">
        Jump into the guides
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DocCard
          href="/docs/payments"
          title="Collect a payment"
          description="Create, retrieve, and list STK-shaped payments with curl examples."
        />
        <DocCard
          href="/docs/webhooks"
          title="Webhooks"
          description="Signed callbacks for payment.succeeded and payment.failed."
        />
        <DocCard
          href="/docs/sandbox"
          title="Sandbox testing"
          description="Deterministic phone rules and outcome override headers."
        />
        <DocCard
          href="/docs/reference"
          title="API reference"
          description="Endpoint and model docs — each operation on its own page."
        />
      </div>

      <h2 className="font-display mt-12 text-xl font-semibold text-foreground">At a glance</h2>
      <SimpleTable
        headers={["Topic", "Detail"]}
        rows={[
          ["Auth", "Authorization: Bearer uk_test_… or uk_live_…"],
          ["Amounts", "Minor units (15000 = 150.00 KES)"],
          ["Primary method", "mpesa_stk"],
          ["Currencies (MVP)", "KES, TZS, UGX, RWF"],
          ["Markets (MVP)", "Kenya, Tanzania, Uganda, Rwanda"],
        ]}
      />

      <CodeBlock title="Quick create">{`curl -X POST "$BASE_URL/api/v1/payments" \\
  -H "Authorization: Bearer uk_test_…" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order_123" \\
  -d '{
    "amount": 15000,
    "currency": "KES",
    "method": "mpesa_stk",
    "phone": "254712345678"
  }'`}</CodeBlock>

      <p className="mt-6 text-sm text-muted">
        Prefer the contract file? Open <InlineCode>/openapi.yaml</InlineCode> or browse the{" "}
        <a href="/docs/reference" className="font-medium text-accent hover:underline">
          API reference
        </a>
        .
      </p>

      <DocsPager next={{ href: "/docs/mobile-money", label: "Mobile money" }} />
    </div>
  );
}
