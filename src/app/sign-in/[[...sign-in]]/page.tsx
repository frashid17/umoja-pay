import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Umoja Pay merchant account.">
      <SignInForm />
    </AuthShell>
  );
}
