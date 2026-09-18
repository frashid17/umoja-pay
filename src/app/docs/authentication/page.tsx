import {
  CodeBlock,
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function AuthenticationPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Start building"
        title="Authentication"
        lead="Merchant API calls authenticate with a secret API key in the Authorization header. Dashboard sessions use Clerk — never mix the two."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <h2 className="font-display text-2xl font-bold text-foreground">API keys</h2>
        <p>
          Create keys in the merchant dashboard. The plaintext secret is shown once. Umoja Pay stores
          only a hash.
        </p>
        <SimpleTable
          headers={["Prefix", "Mode", "When to use"]}
          rows={[
            ["uk_test_", "Sandbox", "Local/dev and integration tests"],
            ["uk_live_", "Live", "Only after KYC approval"],
          ]}
        />

        <CodeBlock title="Request header">{`Authorization: Bearer uk_test_xxxxxxxx`}</CodeBlock>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Key rules</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Send keys only from your <strong className="text-foreground">server</strong> — never
            embed them in mobile apps or browser JS.
          </li>
          <li>
            A <InlineCode>uk_test_</InlineCode> key cannot create live money movements.
          </li>
          <li>
            A <InlineCode>uk_live_</InlineCode> key is rejected until the merchant is KYC-approved.
          </li>
          <li>Revoke compromised keys immediately in the dashboard.</li>
          <li>
            Rotate by creating a new key, updating deployments, then revoking the old one.
          </li>
        </ul>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">Errors</h2>
        <SimpleTable
          headers={["HTTP", "Meaning"]}
          rows={[
            ["401", "Missing, malformed, or unknown API key"],
            ["403", "Valid key but mode/KYC not allowed for this action"],
            ["429", "Rate limited — back off and retry"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          Dashboard vs API
        </h2>
        <p>
          Signing in to <InlineCode>/dashboard</InlineCode> uses Clerk cookies/sessions. The public
          payment API does <strong className="text-foreground">not</strong> accept Clerk JWTs —
          only API keys.
        </p>
      </div>

      <DocsPager
        prev={{ href: "/docs/how-to-start", label: "How to start" }}
        next={{ href: "/docs/going-live", label: "Going live" }}
      />
    </div>
  );
}
