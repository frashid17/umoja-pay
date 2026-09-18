import Link from "next/link";
import {
  CodeBlock,
  DocCard,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function ReferenceOverviewPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="API reference"
        title="Overview"
        lead="Merchant Payments API for East Africa. Authenticate with a secret key, charge via M-Pesa STK, and confirm with webhooks."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <SimpleTable
          headers={["Topic", "Detail"]}
          rows={[
            ["Base URL", "{APP_URL}/api/v1"],
            ["Auth", "Authorization: Bearer uk_test_… or uk_live_…"],
            ["Format", "JSON"],
            ["Amounts", "Integer minor units (15000 = 150.00 KES)"],
            ["OpenAPI", "/openapi.yaml"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Endpoints</h2>
        <div className="grid gap-3">
          <DocCard
            href="/docs/reference/create-payment"
            title="POST /payments"
            description="Create an STK Push payment. Supports Idempotency-Key and sandbox outcome overrides."
          />
          <DocCard
            href="/docs/reference/list-payments"
            title="GET /payments"
            description="List recent payments for the authenticated merchant."
          />
          <DocCard
            href="/docs/reference/retrieve-payment"
            title="GET /payments/{id}"
            description="Retrieve a single payment by id."
          />
        </div>

        <h2 className="font-display pt-6 text-2xl font-bold text-foreground">Models</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <DocCard
            href="/docs/reference/payment"
            title="Payment"
            description="The payment object returned by create, retrieve, and list."
          />
          <DocCard
            href="/docs/reference/create-payment-request"
            title="CreatePaymentRequest"
            description="Request body for creating a payment."
          />
          <DocCard
            href="/docs/reference/error"
            title="Error"
            description="Structured error body for 4xx and 5xx responses."
          />
        </div>

        <h2 className="font-display pt-6 text-2xl font-bold text-foreground">Authentication</h2>
        <p>
          Pass your API key on every request. Never send keys from a browser or mobile app.
        </p>
        <CodeBlock title="Header">{`Authorization: Bearer uk_test_xxxxxxxx`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Sandbox</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Phone numbers ending in <InlineCode>0</InlineCode> fail; others succeed.
          </li>
          <li>
            Override with <InlineCode>X-Umoja-Sandbox-Outcome: succeeded|failed</InlineCode>.
          </li>
          <li>
            Or use the{" "}
            <Link href="/dashboard/sandbox" className="font-medium text-accent hover:underline">
              Sandbox console
            </Link>
            .
          </li>
        </ul>
      </div>

      <DocsPager
        prev={{ href: "/docs/errors", label: "Errors & codes" }}
        next={{ href: "/docs/reference/create-payment", label: "Create a payment" }}
      />
    </div>
  );
}
