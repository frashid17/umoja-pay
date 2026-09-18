import Link from "next/link";
import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function HowToStartPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Start building"
        title="How to start"
        lead="New merchants begin in sandbox. You can integrate and test without real money. Live payments unlock after KYC."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">1. Create an account</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <Link href="/sign-up" className="font-medium text-accent hover:underline">
              Sign up
            </Link>{" "}
            with Clerk.
          </li>
          <li>Complete onboarding (business name + country).</li>
          <li>
            Open the{" "}
            <Link href="/dashboard" className="font-medium text-accent hover:underline">
              merchant dashboard
            </Link>
            .
          </li>
        </ol>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">2. Where is the API?</h2>
        <p>
          Append endpoints to your app base URL. Locally that is usually{" "}
          <InlineCode>http://localhost:3000/api/v1</InlineCode>.
        </p>
        <SimpleTable
          headers={["Environment", "Base URL"]}
          rows={[
            ["Local / current deploy", "{APP_URL}/api/v1"],
            ["Create payment", "{APP_URL}/api/v1/payments"],
            ["Retrieve payment", "{APP_URL}/api/v1/payments/{id}"],
            ["List payments", "{APP_URL}/api/v1/payments"],
            ["OpenAPI", "{APP_URL}/openapi.yaml"],
          ]}
        />
        <p>
          Store the base URL in environment-specific config. Never hardcode keys in the client.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          3. Where is the dashboard?
        </h2>
        <p>From the console you can:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Generate / revoke API keys</li>
          <li>Submit KYC documents</li>
          <li>Configure webhook URLs + signing secrets</li>
          <li>Inspect payments</li>
        </ul>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          4. Create a test API key
        </h2>
        <p>
          In <InlineCode>/dashboard/keys</InlineCode>, create a{" "}
          <InlineCode>uk_test_…</InlineCode> secret. Copy it immediately — it is shown once and
          stored hashed.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          5. Make your first charge
        </h2>
        <CodeBlock title="curl">{`curl -i -X POST "$BASE_URL/api/v1/payments" \\
  -H "Authorization: Bearer uk_test_…" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: demo-001" \\
  -d '{
    "amount": 15000,
    "currency": "KES",
    "method": "mpesa_stk",
    "phone": "254712345678",
    "reference": "demo-001"
  }'`}</CodeBlock>
        <p>
          Next: set up{" "}
          <Link href="/docs/webhooks" className="font-medium text-accent hover:underline">
            webhooks
          </Link>{" "}
          and read{" "}
          <Link href="/docs/sandbox" className="font-medium text-accent hover:underline">
            sandbox testing
          </Link>
          .
        </p>
      </div>

      <DocsPager
        prev={{ href: "/docs/what-to-know", label: "What you should know" }}
        next={{ href: "/docs/authentication", label: "Authentication" }}
      />
    </div>
  );
}
