import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  SimpleTable,
} from "@/components/docs/ui";

export default function CreatePaymentRequestModelPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Models"
        title="CreatePaymentRequest"
        lead="Request body for POST /api/v1/payments. Amounts are always integer minor units."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <SimpleTable
          headers={["Field", "Type", "Required", "Notes"]}
          rows={[
            ["amount", "integer", "Yes", "min 1"],
            ["currency", "string", "Yes", "KES | TZS | UGX | RWF"],
            ["phone", "string", "Yes", "MSISDN, e.g. 254712345678"],
            ["method", "string", "No", "Default mpesa_stk"],
            ["reference", "string", "No", "Your order / invoice id"],
            ["metadata", "object", "No", "Arbitrary JSON"],
            ["callback_url", "string (uri)", "No", "Stored in metadata"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Example</h2>
        <CodeBlock title="Body">{`{
  "amount": 15000,
  "currency": "KES",
  "method": "mpesa_stk",
  "phone": "254712345678",
  "reference": "order_123",
  "metadata": { "order_id": "123" }
}`}</CodeBlock>
      </div>

      <DocsPager
        prev={{ href: "/docs/reference/payment", label: "Payment" }}
        next={{ href: "/docs/reference/error", label: "Error" }}
      />
    </div>
  );
}
