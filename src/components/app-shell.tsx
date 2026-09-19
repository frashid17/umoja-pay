"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/brand/logo";

type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon:
    | "overview"
    | "sandbox"
    | "kyc"
    | "keys"
    | "payments"
    | "settlements"
    | "webhooks"
    | "settings"
    | "merchants"
    | "checkout";
};

const merchantLinks: NavLink[] = [
  { href: "/dashboard", label: "Overview", exact: true, icon: "overview" },
  { href: "/dashboard/sandbox", label: "Sandbox", icon: "sandbox" },
  { href: "/dashboard/checkout", label: "Checkout", icon: "checkout" },
  { href: "/dashboard/kyc", label: "KYC", icon: "kyc" },
  { href: "/dashboard/keys", label: "API keys", icon: "keys" },
  { href: "/dashboard/payments", label: "Payments", icon: "payments" },
  { href: "/dashboard/settlements", label: "Settlements", icon: "settlements" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "webhooks" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Overview", exact: true, icon: "overview" },
  { href: "/admin/merchants", label: "Merchants", icon: "merchants" },
  { href: "/admin/kyc", label: "KYC queue", icon: "kyc" },
  { href: "/admin/payments", label: "Payments", icon: "payments" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name, className }: { name: NavLink["icon"]; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <path {...stroke} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "sandbox":
      return (
        <svg {...common}>
          <path {...stroke} d="M8 8h8v8H8V8Z" />
          <path {...stroke} d="M10 4v4M14 4v4M10 16v4M14 16v4M4 10h4M4 14h4M16 10h4M16 14h4" />
        </svg>
      );
    case "kyc":
      return (
        <svg {...common}>
          <path {...stroke} d="M9 11.5 11 13.5 15.5 9" />
          <path {...stroke} d="M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
        </svg>
      );
    case "keys":
      return (
        <svg {...common}>
          <circle {...stroke} cx="8" cy="14" r="3.5" />
          <path {...stroke} d="M11 12.5 20 3.5M17 6.5l2.5 2.5M15 8.5l2 2" />
        </svg>
      );
    case "payments":
      return (
        <svg {...common}>
          <path {...stroke} d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z" />
          <path {...stroke} d="M4 10h16" />
        </svg>
      );
    case "checkout":
      return (
        <svg {...common}>
          <path {...stroke} d="M6 7h12l-1 12H7L6 7Z" />
          <path {...stroke} d="M9 7V5.5A3 3 0 0 1 15 5.5V7" />
        </svg>
      );
    case "settlements":
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3v18M7 8.5c0-1.9 2.2-3.5 5-3.5s5 1.6 5 3.5-2.2 3.5-5 3.5-5 1.6-5 3.5 2.2 3.5 5 3.5 5-1.6 5-3.5" />
        </svg>
      );
    case "webhooks":
      return (
        <svg {...common}>
          <path {...stroke} d="M10 13a3.5 3.5 0 1 0-3.2 4.9H18a3 3 0 1 0-.3-6 4.5 4.5 0 0 0-8.6-1.4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle {...stroke} cx="12" cy="12" r="3" />
          <path
            {...stroke}
            d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"
          />
        </svg>
      );
    case "merchants":
      return (
        <svg {...common}>
          <path {...stroke} d="M16 21v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2" />
          <circle {...stroke} cx="9.5" cy="7.5" r="3" />
          <path {...stroke} d="M22 21v-2a3 3 0 0 0-2.2-2.9M16.5 4.6a3 3 0 0 1 0 5.8" />
        </svg>
      );
  }
}

export function AppShell({
  children,
  variant,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  variant: "merchant" | "admin";
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const links = variant === "admin" ? adminLinks : merchantLinks;
  const activeLabel =
    links.find((link) => isActive(pathname, link.href, link.exact))?.label ??
    (variant === "admin" ? "Admin" : "Dashboard");

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 z-30 flex h-svh w-16 shrink-0 flex-col border-r border-border bg-card text-foreground md:w-56 lg:w-60">
        <div className="flex h-full flex-col px-2 py-4 md:px-4 md:py-6">
          <Link
            href="/"
            className="mx-auto inline-flex items-center gap-2.5 md:mx-0 md:px-1"
            title="Umoja Pay"
          >
            <LogoMark className="h-7 w-7 shrink-0" />
            <span className="hidden font-display text-lg font-bold tracking-tight text-foreground md:inline">
              Umoja Pay
            </span>
          </Link>
          <p className="mt-2 hidden px-1 text-xs text-muted md:block">
            {variant === "admin" ? "Platform admin" : "Merchant"}
          </p>

          <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto md:mt-10 md:gap-0.5">
            {links.map((link) => {
              const active = isActive(pathname, link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center justify-center gap-3 rounded-lg px-0 py-2.5 text-sm transition md:justify-start md:rounded-md md:px-3 md:py-2 ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:bg-sand/80 hover:text-foreground"
                  }`}
                >
                  <NavIcon
                    name={link.icon}
                    className={`h-[1.15rem] w-[1.15rem] shrink-0 ${
                      active ? "text-accent" : "text-muted group-hover:text-foreground"
                    }`}
                  />
                  <span className="hidden truncate md:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 space-y-1 border-t border-border pt-4 md:mt-8 md:space-y-2 md:pt-5">
            <Link
              href="/docs"
              title="API docs"
              className="flex items-center justify-center rounded-lg px-0 py-2 text-sm text-muted transition hover:bg-sand/80 hover:text-foreground md:justify-start md:px-3"
            >
              <span className="md:hidden" aria-hidden>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 4h8l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                  <path d="M15 4v4h4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="hidden md:inline">API docs</span>
            </Link>
            {variant === "merchant" ? (
              <Link
                href="/admin"
                title="Admin"
                className="flex items-center justify-center rounded-lg px-0 py-2 text-sm text-muted transition hover:bg-sand/80 hover:text-foreground md:justify-start md:px-3"
              >
                <span className="md:hidden" aria-hidden>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3 4 7v5c0 4.5 3.2 8.4 8 9.5 4.8-1.1 8-5 8-9.5V7l-8-4Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="hidden md:inline">Admin</span>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                title="Merchant dashboard"
                className="flex items-center justify-center rounded-lg px-0 py-2 text-sm text-muted transition hover:bg-sand/80 hover:text-foreground md:justify-start md:px-3"
              >
                <span className="md:hidden" aria-hidden>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="hidden md:inline">Merchant dashboard</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-atmosphere">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1 md:hidden">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                {variant === "admin" ? "Platform admin" : "Merchant"}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{activeLabel}</p>
            </div>
            <Link
              href="/docs"
              className="mr-auto hidden text-sm text-muted transition hover:text-foreground md:inline"
            >
              Docs
            </Link>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <UserButton />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-5xl">
            {title ? (
              <div className="mb-6 sm:mb-8">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {title}
                </h1>
                {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
