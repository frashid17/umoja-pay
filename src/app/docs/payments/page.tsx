import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function PaymentsPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Guides"
        title="Collect a payment"
        lead="Create an STK-shaped payment, show the customer a phone prompt state, then confirm via webhook or retrieve."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Create</h2>
        <p>
          <InlineCode>POST /api/v1/payments</InlineCode>
        </p>
        <SimpleTable
          headers={["Field", "Type", "Notes"]}
          rows={[
            ["amount", "integer", "Minor units; required"],
            ["currency", "string", "KES | TZS | UGX | RWF"],
            ["method", "string", "mpesa_stk"],
            ["phone", "string", "MSISDN, e.g. 2547…"],
            ["reference", "string", "Optional merchant reference"],
            ["metadata", "object", "Optional opaque JSON"],
          ]}
        />
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

        <CodeBlock title="Example response">{`{
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
        <p>
          In sandbox, the create path typically settles quickly to{" "}
          <InlineCode>succeeded</InlineCode> or <InlineCode>failed</InlineCode>. In live mode,
          expect <InlineCode>pending</InlineCode> / <InlineCode>processing</InlineCode> until the
          network confirms.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Retrieve</h2>
        <p>
          <InlineCode>GET /api/v1/payments/:id</InlineCode>
        </p>
        <CodeBlock title="Request">{`curl "$BASE_URL/api/v1/payments/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \\
  -H "Authorization: Bearer uk_test_…"`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">List</h2>
        <p>
          <InlineCode>GET /api/v1/payments</InlineCode> — returns recent payments for the
          authenticated merchant. Use retrieve + webhooks for order-critical confirmation.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Integration sketch</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Create payment when the customer confirms checkout.</li>
          <li>Persist <InlineCode>payment.id</InlineCode> against your order.</li>
          <li>Show “Approve on your phone” UI.</li>
          <li>
            Mark the order paid only when status is <InlineCode>succeeded</InlineCode>.
          </li>
          <li>
            On <InlineCode>failed</InlineCode>, allow retry with a new idempotency key (new attempt).
          </li>
        </ol>
      </div>

      <DocsPager
        prev={{ href: "/docs/going-live", label: "Going live" }}
        next={{ href: "/docs/statuses", label: "Payment statuses" }}
      />
    </div>
  );
}
