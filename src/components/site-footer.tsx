import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs/how-to-start", label: "Get started" },
      { href: "/docs/reference", label: "API reference" },
      { href: "/dashboard/sandbox", label: "Sandbox" },
      { href: "/docs/webhooks", label: "Webhooks" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/docs/authentication", label: "Authentication" },
      { href: "/docs/payments", label: "Collect a payment" },
      { href: "/docs/sandbox", label: "Sandbox testing" },
      { href: "/docs/errors", label: "Errors & codes" },
      { href: "/openapi.yaml", label: "OpenAPI spec" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/sign-up", label: "Create account" },
      { href: "/sign-in", label: "Log in" },
      { href: "/docs/going-live", label: "Going live" },
      { href: "mailto:support@umoja.pay", label: "Support" },
      { href: "mailto:hello@umoja.pay", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/terms", label: "Terms of service" },
      { href: "/legal/security", label: "Security" },
      { href: "/legal/acceptable-use", label: "Acceptable use" },
      { href: "/legal/cookies", label: "Cookie policy" },
      { href: "/legal/disclosure", label: "Responsible disclosure" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link href="/" className="inline-block">
              <Logo variant="horizontal" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              East Africa payment infrastructure for merchants. One STK-shaped API, sandbox first,
              live after KYC.
            </p>
            <p className="mt-6 text-xs text-muted">
              Markets: Kenya · Tanzania · Uganda · Rwanda
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Umoja Pay. All rights reserved.</p>
          <p>Payments technology · Not a bank. Settlement via licensed partners.</p>
        </div>
      </div>
    </footer>
  );
}
