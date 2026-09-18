import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Logo } from "@/components/brand/logo";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const admin = user ? await isPlatformAdmin(user.id, user.email) : false;

  return (
    <div className="min-h-svh bg-atmosphere">
      <SiteHeader isAdmin={admin} />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span>
          <Logo variant="mark" />
          <span>Home</span>
        </Link>
        <article className="prose-legal mt-8">{children}</article>
      </main>
      <SiteFooter />
    </div>
  );
}
