import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  SimpleTable,
} from "@/components/docs/ui";

export default function ErrorModelPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Models"
        title="Error"
        lead="Structured error body returned for 4xx and 5xx responses."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <SimpleTable
          headers={["Field", "Type", "Description"]}
          rows={[
            ["error.code", "string", "Machine-readable code"],
            ["error.message", "string", "Human-readable explanation"],
            ["error.param", "string", "Optional field that failed validation"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Example</h2>
        <CodeBlock title="ErrorBody">{`{
  "error": {
    "code": "invalid_request",
    "message": "amount must be a positive integer",
    "param": "amount"
  }
}`}</CodeBlock>
      </div>

      <DocsPager
        prev={{ href: "/docs/reference/create-payment-request", label: "CreatePaymentRequest" }}
      />
    </div>
  );
}
