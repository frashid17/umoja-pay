import {
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function StatusesPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Guides"
        title="Payment statuses"
        lead="Every payment moves through a small status machine. Only terminal states should unlock fulfillment."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <SimpleTable
          headers={["Status", "Terminal?", "Meaning"]}
          rows={[
            ["pending", "No", "Accepted; awaiting customer / provider"],
            ["processing", "No", "In flight with the provider"],
            ["succeeded", "Yes", "Funds authorized / collected"],
            ["failed", "Yes", "Declined, timed out, or errored"],
            ["canceled", "Yes", "Abandoned before completion"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Recommended mapping</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <InlineCode>pending</InlineCode> / <InlineCode>processing</InlineCode> → show waiting UI
          </li>
          <li>
            <InlineCode>succeeded</InlineCode> → fulfill / mark paid
          </li>
          <li>
            <InlineCode>failed</InlineCode> / <InlineCode>canceled</InlineCode> → allow retry
          </li>
        </ul>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          Do not fulfill early
        </h2>
        <p>
          A <InlineCode>201 Created</InlineCode> with <InlineCode>status: pending</InlineCode> is
          not payment confirmation. Race conditions happen if you trust create alone.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Polling vs webhooks</h2>
        <p>
          Prefer webhooks for terminal updates. Poll retrieve as a backup if a webhook is delayed,
          but back off (for example every few seconds, then slower) to avoid hammering the API.
        </p>
      </div>

      <DocsPager
        prev={{ href: "/docs/payments", label: "Collect a payment" }}
        next={{ href: "/docs/webhooks", label: "Webhooks" }}
      />
    </div>
  );
}
