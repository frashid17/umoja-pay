import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function WhatToKnowPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Learn"
        title="What you should know"
        lead="Mobile money APIs are asynchronous financial systems. Design your checkout around terminal statuses, not the create response alone."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Treat payments as async</h2>
        <p>
          A successful HTTP create means Umoja Pay accepted the request — not that the customer paid.
          Always wait for <InlineCode>succeeded</InlineCode> or <InlineCode>failed</InlineCode> via
          webhook, or poll <InlineCode>GET /api/v1/payments/:id</InlineCode>.
        </p>
        <SimpleTable
          headers={["Bad assumption", "Correct approach"]}
          rows={[
            ["201 = order is paid", "Only succeeded is paid"],
            ["Ignore webhooks", "Prefer webhooks; poll as backup"],
            ["Retry create on timeout without key", "Reuse the same Idempotency-Key"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Idempotency</h2>
        <p>
          Networks drop. Clients retry. Send a stable{" "}
          <InlineCode>Idempotency-Key</InlineCode> (for example your order id) on every create. Umoja
          Pay returns the original payment instead of charging twice.
        </p>
        <CodeBlock title="Header">{`Idempotency-Key: order_123`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Amounts</h2>
        <p>
          Amounts are <strong className="text-foreground">minor units</strong> (integers). Never send
          floats.
        </p>
        <SimpleTable
          headers={["You send", "Customer sees"]}
          rows={[
            ["15000 + KES", "150.00 KES"],
            ["1000 + KES", "10.00 KES"],
            ["50000 + TZS", "500.00 TZS"],
          ]}
        />
        <p>
          Always send integers. Currency decimals are fixed at 2 for MVP currencies in the API
          contract — multiply major units by 100.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Phone numbers</h2>
        <p>
          Prefer international MSISDN without a leading <InlineCode>+</InlineCode>:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Kenya: <InlineCode>2547XXXXXXXX</InlineCode>
          </li>
          <li>
            Tanzania: <InlineCode>2557XXXXXXXX</InlineCode>
          </li>
          <li>
            Uganda: <InlineCode>2567XXXXXXXX</InlineCode>
          </li>
          <li>
            Rwanda: <InlineCode>2507XXXXXXXX</InlineCode>
          </li>
        </ul>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Customer UX</h2>
        <p>
          Show a clear “check your phone to approve” state after create. Handle decline, timeout, and
          insufficient funds as normal failed outcomes — not application crashes.
        </p>
      </div>

      <DocsPager
        prev={{ href: "/docs/mobile-money", label: "Mobile money" }}
        next={{ href: "/docs/how-to-start", label: "How to start" }}
      />
    </div>
  );
}
