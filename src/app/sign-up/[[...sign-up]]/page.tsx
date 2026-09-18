import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start integrating East Africa payments in minutes."
    >
      <SignUpForm />
    </AuthShell>
  );
}
