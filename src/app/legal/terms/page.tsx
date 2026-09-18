export default function TermsPage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Legal</p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground">
        Terms of service
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: 19 September 2026</p>

      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted">
        <p>
          These Terms govern access to Umoja Pay&apos;s merchant dashboard, APIs, sandbox, and
          related services (the &quot;Services&quot;). By creating an account or calling the API, you
          agree to these Terms.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">The Services</h2>
        <p>
          Umoja Pay provides payment aggregation tooling so merchants can initiate mobile money
          payments (including M-Pesa STK-shaped flows), receive status updates, and manage API keys.
          Umoja Pay is not a bank. Settlement and payouts depend on licensed partners and applicable
          network rules.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Accounts & KYC</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You must provide accurate business information and keep it current.</li>
          <li>Sandbox / test mode does not move live money.</li>
          <li>Live keys and live money require approved KYC and continued compliance.</li>
          <li>You are responsible for safeguarding API secrets and webhook signing secrets.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">Acceptable use</h2>
        <p>
          You must not use the Services for illegal activity, abusive traffic, or in violation of
          our{" "}
          <a href="/legal/acceptable-use" className="text-accent hover:underline">
            Acceptable use policy
          </a>
          . We may suspend access for risk, fraud, or policy violations.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Fees</h2>
        <p>
          Fees (if any) will be disclosed in your merchant agreement or dashboard. You remain
          responsible for taxes applicable to your business.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">
          Disclaimers & liability
        </h2>
        <p>
          The Services are provided on an &quot;as available&quot; basis during MVP. To the maximum
          extent permitted by law, Umoja Pay disclaims warranties of uninterrupted or error-free
          operation. Liability is limited to fees paid for the Services in the three months before
          the claim, except where liability cannot be limited by law.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Contact</h2>
        <p>
          Legal:{" "}
          <a href="mailto:legal@umoja.pay" className="text-accent hover:underline">
            legal@umoja.pay
          </a>
        </p>
      </div>
    </>
  );
}
