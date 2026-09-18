export default function AcceptableUsePage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Legal</p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground">
        Acceptable use policy
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: 19 September 2026</p>

      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted">
        <p>
          Merchants and developers must use Umoja Pay lawfully and in ways that protect customers,
          networks, and the integrity of the platform.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">You may</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Integrate sandbox and live APIs for legitimate goods and services.</li>
          <li>Test extensively in sandbox using documented fixtures and headers.</li>
          <li>Build checkouts, billing, and back-office tools on top of the API.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">You may not</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Process payments for illegal goods, fraud, or prohibited industries.</li>
          <li>Attempt to bypass KYC, rate limits, or security controls.</li>
          <li>Probe, scrape, or attack the platform beyond authorized testing.</li>
          <li>Misrepresent your business identity or settlement details.</li>
          <li>Resell access without a written partnership agreement.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">Enforcement</h2>
        <p>
          We may investigate, throttle, suspend, or terminate accounts that violate this policy or
          create unacceptable risk. Questions:{" "}
          <a href="mailto:compliance@umoja.pay" className="text-accent hover:underline">
            compliance@umoja.pay
          </a>
          .
        </p>
      </div>
    </>
  );
}
