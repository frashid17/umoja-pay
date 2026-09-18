"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { docsNav } from "@/components/docs/ui";
import { Logo } from "@/components/brand/logo";

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/docs") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function flatDocsLinks() {
  return docsNav.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      {open ? (
        <path
          d="M6 6l12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function DocsShell({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = flatDocsLinks();
  const activeHref =
    links.find((item) => isActive(pathname, item.href, "exact" in item ? item.exact : false))
      ?.href ?? "/docs";
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Link href="/" className="min-w-0 shrink">
              <Logo variant="horizontal" />
            </Link>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <Link
              href="/docs"
              className="hidden text-sm text-muted hover:text-foreground sm:inline"
            >
              Documentation
            </Link>
          </div>

          <nav className="hidden items-center gap-1.5 text-sm md:flex md:gap-2">
            <Show when="signed-in">
              <Link href="/dashboard" className="px-2 py-1.5 text-muted hover:text-foreground">
                Dashboard
              </Link>
              {isAdmin ? (
                <Link href="/admin" className="px-2 py-1.5 text-muted hover:text-foreground">
                  Admin
                </Link>
              ) : null}
              <UserButton />
            </Show>
            <Show when="signed-out">
              <Link href="/sign-in" className="px-2 py-1.5 text-muted hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-foreground"
              >
                Get API keys
              </Link>
            </Show>
            <ThemeToggle />
          </nav>

          <div className="flex items-center gap-1.5 md:hidden">
            <ThemeToggle />
            <Show when="signed-in">
              <UserButton />
            </Show>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:border-accent hover:text-accent"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <MenuIcon open={open} />
            </button>
          </div>
        </div>

        <div
          id={menuId}
          className={`border-t border-border bg-background md:hidden ${open ? "block" : "hidden"}`}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm sm:px-6">
            <Link href="/docs" className="rounded-md px-3 py-2.5 text-foreground hover:bg-card">
              Documentation
            </Link>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2.5 text-foreground hover:bg-card"
              >
                Dashboard
              </Link>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-2.5 text-foreground hover:bg-card"
                >
                  Admin
                </Link>
              ) : null}
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="rounded-md px-3 py-2.5 text-foreground hover:bg-card"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="mt-1 rounded-md bg-accent px-3 py-2.5 text-center font-medium text-accent-foreground"
              >
                Get API keys
              </Link>
            </Show>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="border-b border-border lg:sticky lg:top-[53px] lg:h-[calc(100svh-53px)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-8 lg:pr-4 lg:pl-6">
          <div className="px-4 py-3 lg:hidden">
            <label htmlFor="docs-nav" className="sr-only">
              Documentation section
            </label>
            <select
              id="docs-nav"
              value={activeHref}
              onChange={(e) => router.push(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {docsNav.map((group) => (
                <optgroup key={group.title} label={group.title}>
                  {group.items.map((item) => (
                    <option key={item.href} value={item.href}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="hidden space-y-7 lg:block">
            {docsNav.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {group.title}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(
                      pathname,
                      item.href,
                      "exact" in item ? item.exact : false,
                    );
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={
                            active
                              ? "block rounded-md bg-accent-soft px-3 py-2 text-sm font-medium text-accent"
                              : "block rounded-md px-3 py-2 text-sm text-muted hover:bg-card hover:text-foreground"
                          }
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
