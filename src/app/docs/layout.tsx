import { DocsShell } from "@/components/docs-shell";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const admin = user ? await isPlatformAdmin(user.id, user.email) : false;

  return <DocsShell isAdmin={admin}>{children}</DocsShell>;
}
