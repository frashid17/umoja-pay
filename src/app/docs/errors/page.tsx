import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function ErrorsPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Guides"
        title="Errors & codes"
        lead="API errors return structured JSON. Map HTTP status for control flow; use error codes for logging and support."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Error body</h2>
        <CodeBlock title="Shape">{`{
  "error": {
    "code": "invalid_request",
    "message": "amount must be a positive integer",
    "param": "amount"
  }
}`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">HTTP statuses</h2>
        <SimpleTable
          headers={["HTTP", "When"]}
          rows={[
            ["400", "Validation failed / bad JSON"],
            ["401", "Missing or invalid API key"],
            ["403", "Authenticated but not allowed (KYC / mode)"],
            ["404", "Unknown payment id for this merchant"],
            ["409", "Conflict (e.g. idempotency payload mismatch)"],
            ["429", "Rate limited"],
            ["500", "Unexpected server error"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Common codes</h2>
        <SimpleTable
          headers={["code", "Meaning"]}
          rows={[
            ["invalid_request", "Body or query failed validation"],
            ["authentication_required", "No usable Bearer token"],
            ["forbidden", "Key valid but action denied"],
            ["not_found", "Resource missing in your tenant"],
            ["idempotency_conflict", "Same key, different body"],
            ["rate_limited", "Too many requests"],
            ["provider_error", "Upstream / adapter failure"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Handling tips</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Show <InlineCode>message</InlineCode> to developers; map codes for user-facing copy.
          </li>
          <li>
            Retry <InlineCode>429</InlineCode> / transient <InlineCode>500</InlineCode> with
            exponential backoff and the same idempotency key for creates.
          </li>
          <li>
            Do not retry <InlineCode>400</InlineCode> / <InlineCode>401</InlineCode> without fixing
            the request.
          </li>
        </ul>
      </div>

      <DocsPager
        prev={{ href: "/docs/sandbox", label: "Sandbox testing" }}
        next={{ href: "/docs/reference", label: "API reference" }}
      />
    </div>
  );
}
