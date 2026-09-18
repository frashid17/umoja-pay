import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  SimpleTable,
} from "@/components/docs/ui";

export default function PaymentModelPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Models"
        title="Payment"
        lead="The Payment object represents an STK-shaped charge. Returned by create, retrieve, and list."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <SimpleTable
          headers={["Field", "Type", "Description"]}
          rows={[
            ["id", "uuid", "Unique payment id"],
            ["amount", "integer", "Minor units"],
            ["currency", "string", "KES | TZS | UGX | RWF"],
            ["method", "string", "mpesa_stk"],
            ["phone", "string", "Customer MSISDN"],
            ["status", "string", "pending | processing | succeeded | failed | canceled"],
            ["reference", "string | null", "Merchant reference"],
            ["metadata", "object", "Opaque JSON"],
            ["mode", "string", "test | live"],
            ["provider_ref", "string | null", "Upstream / sandbox reference"],
            ["failure_reason", "string | null", "Present when failed"],
            ["created_at", "datetime", "ISO-8601"],
            ["updated_at", "datetime", "ISO-8601"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Example</h2>
        <CodeBlock title="Payment">{`{
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
      </div>

      <DocsPager
        prev={{ href: "/docs/reference/retrieve-payment", label: "Retrieve a payment" }}
        next={{ href: "/docs/reference/create-payment-request", label: "CreatePaymentRequest" }}
      />
    </div>
  );
}
