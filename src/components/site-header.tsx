"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";

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

const linkClass =
  "px-2 py-1.5 text-muted transition hover:text-foreground";

export function SiteHeader({
  isAdmin,
  variant = "default",
}: {
  isAdmin?: boolean;
  variant?: "default" | "over-hero";
}) {
  const overHero = variant === "over-hero";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={
        overHero
          ? "absolute inset-x-0 top-0 z-20 border-b border-border/70 bg-background/70 backdrop-blur-md"
          : "border-b border-border/80 bg-background/85 backdrop-blur-md"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
        <Link href="/" className="min-w-0 shrink">
          <Logo variant="horizontal" />
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 text-sm md:flex md:gap-2">
          <Link href="/docs" className={linkClass}>
            Docs
          </Link>
          <Show when="signed-in">
            <Link href="/dashboard" className={linkClass}>
              Dashboard
            </Link>
            {isAdmin ? (
              <Link href="/admin" className={linkClass}>
                Admin
              </Link>
            ) : null}
            <UserButton />
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in" className={linkClass}>
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-foreground"
            >
              Start integrating
            </Link>
          </Show>
          <ThemeToggle />
        </nav>

        {/* Mobile */}
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
            Docs
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
              Start integrating
            </Link>
          </Show>
        </nav>
      </div>
    </header>
  );
}
