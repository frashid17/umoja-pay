import Link from "next/link";
import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  EndpointPath,
  SimpleTable,
} from "@/components/docs/ui";

export default function ListPaymentsReferencePage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="API reference"
        title="List payments"
        lead="Return recent payments for the authenticated merchant in the key’s mode (test or live)."
      />

      <EndpointPath method="GET" path="/api/v1/payments" />

      <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Query parameters</h2>
        <SimpleTable
          headers={["Param", "Type", "Notes"]}
          rows={[
            ["limit", "integer", "Default 20, max 100"],
            ["starting_after", "string", "Payment id cursor for pagination"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Example</h2>
        <CodeBlock title="Request">{`curl "$BASE_URL/api/v1/payments?limit=20" \\
  -H "Authorization: Bearer uk_test_…"`}</CodeBlock>

        <CodeBlock title="200 OK">{`{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "amount": 15000,
      "currency": "KES",
      "method": "mpesa_stk",
      "phone": "254712345678",
      "status": "succeeded",
      "mode": "test",
      "created_at": "2026-09-18T12:00:00.000Z"
    }
  ],
  "has_more": false
}`}</CodeBlock>

        <p>
          Each item is a{" "}
          <Link href="/docs/reference/payment" className="font-medium text-accent hover:underline">
            Payment
          </Link>
          . For order confirmation, prefer retrieve + webhooks over list alone.
        </p>
      </div>

      <DocsPager
        prev={{ href: "/docs/reference/create-payment", label: "Create a payment" }}
        next={{ href: "/docs/reference/retrieve-payment", label: "Retrieve a payment" }}
      />
    </div>
  );
}
