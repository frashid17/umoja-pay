import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function WebhooksPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Guides"
        title="Webhooks"
        lead="Umoja Pay POSTs signed JSON events to your endpoint when a payment reaches a terminal status. Verify the signature before trusting the body."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Configure</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Open <InlineCode>/dashboard/webhooks</InlineCode> (or Webhooks in the merchant console).
          </li>
          <li>Set a public HTTPS URL — use a tunnel such as ngrok for local development.</li>
          <li>
            Copy the signing secret (<InlineCode>whsec_…</InlineCode>) and store it server-side
            only.
          </li>
          <li>Configure separate endpoints for test and live modes.</li>
        </ol>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Events</h2>
        <SimpleTable
          headers={["Event", "When"]}
          rows={[
            ["payment.succeeded", "Payment status is succeeded"],
            ["payment.failed", "Payment status is failed"],
          ]}
        />
        <p>
          Event type is <InlineCode>payment.{"{status}"}</InlineCode>. Headers include{" "}
          <InlineCode>X-Umoja-Event</InlineCode> with the same value.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Payload shape</h2>
        <CodeBlock title="Example">{`{
  "id": "evt_<payment_id>",
  "type": "payment.succeeded",
  "created": 1726665660,
  "data": {
    "object": {
      "id": "<payment_uuid>",
      "amount": 15000,
      "currency": "KES",
      "method": "mpesa_stk",
      "phone": "254712345678",
      "status": "succeeded",
      "reference": "order_123",
      "metadata": {},
      "mode": "test",
      "failure_reason": null,
      "created_at": "…",
      "updated_at": "…"
    }
  }
}`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          Verify signatures
        </h2>
        <p>
          Every delivery includes{" "}
          <InlineCode>X-Umoja-Signature: t={"{timestamp}"},v1={"{hmac}"}</InlineCode>.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Read <InlineCode>t</InlineCode> and <InlineCode>v1</InlineCode> from the header.
          </li>
          <li>
            Compute HMAC-SHA256 of <InlineCode>{`{timestamp}.{raw_body}`}</InlineCode> using your
            webhook secret.
          </li>
          <li>Compare digests in constant time. Reject mismatches with 401.</li>
          <li>Optionally reject timestamps that are too old (replay protection).</li>
        </ol>
        <CodeBlock title="Node sketch">{`import { createHmac, timingSafeEqual } from "crypto";

function verify(secret, rawBody, header) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("="))
  );
  const expected = createHmac("sha256", secret)
    .update(parts.t + "." + rawBody)
    .digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Delivery rules</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Return <InlineCode>2xx</InlineCode> quickly after you persist the event.</li>
          <li>Handlers must be idempotent — the same event id may arrive more than once.</li>
          <li>MVP retries once on non-2xx or network error; durable queues come later.</li>
        </ul>
      </div>

      <DocsPager
        prev={{ href: "/docs/statuses", label: "Payment statuses" }}
        next={{ href: "/docs/sandbox", label: "Sandbox testing" }}
      />
    </div>
  );
}
