import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-hero text-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="bg-hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative px-10 pt-10">
          <Link href="/" className="inline-block">
            <Logo variant="horizontal" />
          </Link>
        </div>
        <div className="relative px-10 pb-16">
          <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            <span className="h-1.5 w-1.5 rounded-sm bg-signal" aria-hidden />
            East Africa payments
          </p>
          <h1 className="font-display max-w-md text-4xl font-bold leading-tight text-foreground xl:text-5xl">
            Accept M-Pesa.
            <br />
            Ship with one API.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
            Sandbox keys today. Live mode after KYC. Built for merchants integrating across Kenya,
            Tanzania, Uganda, and Rwanda.
          </p>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col bg-atmosphere">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <Link href="/" className="lg:invisible">
            <Logo variant="horizontal" />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="mt-2 text-sm text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
