export default function SecurityPage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Legal</p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground">
        Security
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: 19 September 2026</p>

      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted">
        <p>
          Security is foundational to a payments platform. This page summarizes how Umoja Pay
          approaches protecting merchant and payment data during the MVP.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Controls</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>API secrets are hashed at rest and shown once on creation.</li>
          <li>Dashboard authentication is handled by a dedicated identity provider (Clerk).</li>
          <li>Tenant data is scoped per merchant; database policies enforce isolation.</li>
          <li>Webhook deliveries are signed (HMAC) so you can verify authenticity.</li>
          <li>Document generation and sensitive actions are rate-limited and audit-logged.</li>
          <li>KYC documents are stored in access-controlled object storage.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">Your responsibilities</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Store API keys only on trusted servers — never in mobile apps or frontends.</li>
          <li>Verify webhook signatures before acting on events.</li>
          <li>Rotate keys if you suspect compromise.</li>
          <li>Use HTTPS for production webhook endpoints.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">Report an issue</h2>
        <p>
          See our{" "}
          <a href="/legal/disclosure" className="text-accent hover:underline">
            responsible disclosure
          </a>{" "}
          process or email{" "}
          <a href="mailto:security@umoja.pay" className="text-accent hover:underline">
            security@umoja.pay
          </a>
          .
        </p>
      </div>
    </>
  );
}
