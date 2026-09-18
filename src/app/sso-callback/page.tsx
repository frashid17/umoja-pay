import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-atmosphere">
      <p className="text-sm text-muted">Completing sign-in…</p>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
