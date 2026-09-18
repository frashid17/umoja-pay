import Link from "next/link";
import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  EndpointPath,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function CreatePaymentReferencePage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="API reference"
        title="Create a payment"
        lead="Start an M-Pesa STK Push charge. Returns a Payment object. In sandbox, settlement is simulated quickly."
      />

      <EndpointPath method="POST" path="/api/v1/payments" />

      <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Headers</h2>
        <SimpleTable
          headers={["Header", "Required", "Description"]}
          rows={[
            ["Authorization", "Yes", "Bearer uk_test_… or uk_live_…"],
            ["Content-Type", "Yes", "application/json"],
            ["Idempotency-Key", "Recommended", "Stable key to prevent duplicate charges"],
            [
              "X-Umoja-Sandbox-Outcome",
              "No",
              "test mode only: succeeded | failed",
            ],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Body</h2>
        <p>
          See{" "}
          <Link
            href="/docs/reference/create-payment-request"
            className="font-medium text-accent hover:underline"
          >
            CreatePaymentRequest
          </Link>
          .
        </p>
        <SimpleTable
          headers={["Field", "Type", "Notes"]}
          rows={[
            ["amount", "integer", "Required. Minor units, min 1"],
            ["currency", "string", "Required. KES | TZS | UGX | RWF"],
            ["phone", "string", "Required. MSISDN e.g. 254712345678"],
            ["method", "string", "Optional. Default mpesa_stk"],
            ["reference", "string", "Optional merchant reference"],
            ["metadata", "object", "Optional opaque JSON"],
            ["callback_url", "string", "Optional URI stored in metadata"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Example</h2>
        <CodeBlock title="Request">{`curl -X POST "$BASE_URL/api/v1/payments" \\
  -H "Authorization: Bearer uk_test_…" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order_123" \\
  -d '{
    "amount": 15000,
    "currency": "KES",
    "method": "mpesa_stk",
    "phone": "254712345678",
    "reference": "order_123",
    "metadata": { "cart_id": "c_9" }
  }'`}</CodeBlock>

        <CodeBlock title="201 Created">{`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 15000,
  "currency": "KES",
  "method": "mpesa_stk",
  "phone": "254712345678",
  "status": "succeeded",
  "reference": "order_123",
  "metadata": { "cart_id": "c_9" },
  "mode": "test",
  "provider_ref": "sandbox_stk_a1b2c3d4",
  "failure_reason": null,
  "created_at": "2026-09-18T12:00:00.000Z",
  "updated_at": "2026-09-18T12:00:00.400Z"
}`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Responses</h2>
        <SimpleTable
          headers={["Status", "Meaning"]}
          rows={[
            ["201", "Payment created (or 200 if idempotent replay)"],
            ["400", "Invalid body"],
            ["401", "Missing or invalid API key"],
            ["403", "Key not allowed for this mode / KYC"],
            ["429", "Rate limited"],
          ]}
        />
        <p>
          Response body is a{" "}
          <Link href="/docs/reference/payment" className="font-medium text-accent hover:underline">
            Payment
          </Link>
          . Prefer webhooks for terminal status in live mode — create may return{" "}
          <InlineCode>pending</InlineCode> / <InlineCode>processing</InlineCode>.
        </p>
      </div>

      <DocsPager
        prev={{ href: "/docs/reference", label: "Overview" }}
        next={{ href: "/docs/reference/list-payments", label: "List payments" }}
      />
    </div>
  );
}
