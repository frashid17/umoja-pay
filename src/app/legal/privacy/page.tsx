export default function PrivacyPage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Legal</p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground">
        Privacy policy
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: 19 September 2026</p>

      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted">
        <p>
          Umoja Pay (&quot;we&quot;, &quot;us&quot;) provides payment infrastructure for merchants in
          East Africa. This policy explains how we collect, use, and protect personal data when you
          use our websites, dashboard, APIs, and related services.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Data we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account data: name, email, authentication identifiers (via our auth provider).</li>
          <li>
            Business / KYC data: legal name, registration numbers, addresses, director details, and
            uploaded documents.
          </li>
          <li>
            Payment data: amounts, currencies, MSISDNs, references, statuses, and provider
            references needed to process and reconcile payments.
          </li>
          <li>Technical data: IP address, device/browser metadata, logs, and security events.</li>
          <li>Support communications you send to us.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">How we use data</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, secure, and improve the Services.</li>
          <li>Complete KYC / compliance reviews and fraud prevention.</li>
          <li>Process payments and deliver webhooks to merchant endpoints.</li>
          <li>Communicate about account status, incidents, and product changes.</li>
          <li>Meet legal, regulatory, and audit obligations.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">Sharing</h2>
        <p>
          We share data with infrastructure providers (hosting, auth, databases), licensed payment
          partners / mobile money operators as required to move funds, and professional advisors or
          authorities when legally required. We do not sell personal data.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Retention</h2>
        <p>
          We retain account and payment records for as long as needed to operate the Service and meet
          legal retention requirements (including multi-year audit retention for financial events).
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Your rights</h2>
        <p>
          Depending on your jurisdiction, you may request access, correction, deletion, or
          restriction of certain personal data. Contact{" "}
          <a href="mailto:privacy@umoja.pay" className="text-accent hover:underline">
            privacy@umoja.pay
          </a>
          . Some records cannot be deleted where law requires retention.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href="mailto:privacy@umoja.pay" className="text-accent hover:underline">
            privacy@umoja.pay
          </a>
        </p>
      </div>
    </>
  );
}
