export default function CookiesPage() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Legal</p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground">
        Cookie policy
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: 19 September 2026</p>

      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted">
        <p>
          Umoja Pay uses cookies and similar technologies to keep you signed in, remember
          preferences (such as theme), and secure the Services.
        </p>

        <h2 className="font-display text-xl font-semibold text-foreground">Types we use</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Essential</strong> — authentication sessions, CSRF
            protection, load balancing.
          </li>
          <li>
            <strong className="text-foreground">Preferences</strong> — theme (light / dark /
            system) and locale when available.
          </li>
          <li>
            <strong className="text-foreground">Analytics</strong> — only if enabled later to
            understand product usage; we will update this page before enabling non-essential
            analytics cookies.
          </li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-foreground">Managing cookies</h2>
        <p>
          You can clear or block cookies in your browser. Blocking essential cookies may prevent
          sign-in or dashboard use.
        </p>

        <p>
          Questions:{" "}
          <a href="mailto:privacy@umoja.pay" className="text-accent hover:underline">
            privacy@umoja.pay
          </a>
        </p>
      </div>
    </>
  );
}
