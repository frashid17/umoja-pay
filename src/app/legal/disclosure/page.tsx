export default function DisclosurePage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Legal</p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground">
        Responsible disclosure
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: 19 September 2026</p>

      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted">
        <p>
          We welcome good-faith reports of security vulnerabilities in Umoja Pay&apos;s websites,
          APIs, and dashboards.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">How to report</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Email{" "}
            <a href="mailto:security@umoja.pay" className="text-accent hover:underline">
              security@umoja.pay
            </a>{" "}
            with a clear description, steps to reproduce, and impact.
          </li>
          <li>Give us reasonable time to investigate before public disclosure.</li>
          <li>Do not access data that is not yours, or degrade the service.</li>
        </ol>

        <h2 className="font-display text-xl font-semibold text-foreground">Out of scope</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Social engineering of staff or customers.</li>
          <li>Denial-of-service / volumetric attacks.</li>
          <li>Findings that require physical access to devices.</li>
          <li>Reports from automated scanners without a demonstrated impact.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">Safe harbor</h2>
        <p>
          If you follow this process in good faith, we will not pursue legal action related to the
          report. We may still involve law enforcement if activity is malicious or illegal.
        </p>
      </div>
    </>
  );
}
