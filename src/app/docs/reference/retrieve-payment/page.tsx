import Link from "next/link";
import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  EndpointPath,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function RetrievePaymentReferencePage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="API reference"
        title="Retrieve a payment"
        lead="Fetch a single payment by id. Only payments belonging to your merchant are visible."
      />

      <EndpointPath method="GET" path="/api/v1/payments/{id}" />

      <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Path parameters</h2>
        <SimpleTable
          headers={["Param", "Type", "Notes"]}
          rows={[["id", "uuid", "Payment id returned from create"]]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Example</h2>
        <CodeBlock title="Request">{`curl "$BASE_URL/api/v1/payments/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \\
  -H "Authorization: Bearer uk_test_…"`}</CodeBlock>

        <CodeBlock title="200 OK">{`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 15000,
  "currency": "KES",
  "method": "mpesa_stk",
  "phone": "254712345678",
  "status": "succeeded",
  "reference": "order_123",
  "metadata": {},
  "mode": "test",
  "provider_ref": "sandbox_stk_a1b2c3d4",
  "failure_reason": null,
  "created_at": "2026-09-18T12:00:00.000Z",
  "updated_at": "2026-09-18T12:00:00.400Z"
}`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Errors</h2>
        <SimpleTable
          headers={["Status", "Meaning"]}
          rows={[
            ["401", "Invalid API key"],
            ["404", "Unknown id for this merchant"],
          ]}
        />
        <p>
          Poll retrieve as a backup when webhooks are delayed. Back off between polls. See the{" "}
          <Link href="/docs/reference/payment" className="font-medium text-accent hover:underline">
            Payment
          </Link>{" "}
          model for field details — terminal statuses are <InlineCode>succeeded</InlineCode>,{" "}
          <InlineCode>failed</InlineCode>, and <InlineCode>canceled</InlineCode>.
        </p>
      </div>

      <DocsPager
        prev={{ href: "/docs/reference/list-payments", label: "List payments" }}
        next={{ href: "/docs/reference/payment", label: "Payment" }}
      />
    </div>
  );
}
