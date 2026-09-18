import Link from "next/link";
import {
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function GoingLivePage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Start building"
        title="Going live"
        lead="Sandbox proves your integration. Live money requires KYC approval, live keys, and production webhook endpoints."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">Checklist</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Finish sandbox flows: create, webhook, retrieve, failure paths (
            <Link href="/docs/sandbox" className="font-medium text-accent hover:underline">
              sandbox testing
            </Link>
            ).
          </li>
          <li>
            Submit KYC from{" "}
            <Link href="/dashboard/kyc" className="font-medium text-accent hover:underline">
              /dashboard/kyc
            </Link>
            .
          </li>
          <li>Wait for admin approval (status becomes approved).</li>
          <li>
            Create a <InlineCode>uk_live_…</InlineCode> key in the dashboard.
          </li>
          <li>Point production webhooks at a public HTTPS URL and verify signatures.</li>
          <li>Switch server config to live base URL + live key.</li>
        </ol>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">KYC documents</h2>
        <p>Typical MVP package (varies by country and risk policy):</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Business registration / certificate</li>
          <li>Director national ID or passport</li>
          <li>Proof of address</li>
          <li>Settlement account details</li>
        </ul>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          Environment separation
        </h2>
        <SimpleTable
          headers={["Concern", "Sandbox", "Live"]}
          rows={[
            ["API key", "uk_test_", "uk_live_"],
            ["Money", "Simulated", "Real"],
            ["Webhooks", "Dev tunnel / staging", "Production HTTPS"],
            ["Idempotency keys", "Can reuse fixtures", "Use real order ids"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Safety tips</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Never log full API secrets.</li>
          <li>Gate live keys behind environment variables per deploy.</li>
          <li>
            Keep sandbox and live merchant data conceptually separate — do not reuse test payment ids
            in production support workflows.
          </li>
          <li>
            Monitor{" "}
            <Link href="/docs/statuses" className="font-medium text-accent hover:underline">
              payment statuses
            </Link>{" "}
            and failed webhook deliveries after cutover.
          </li>
        </ul>
      </div>

      <DocsPager
        prev={{ href: "/docs/authentication", label: "Authentication" }}
        next={{ href: "/docs/payments", label: "Collect a payment" }}
      />
    </div>
  );
}
