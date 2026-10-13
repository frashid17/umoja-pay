"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { signInWithEmail, type AuthFormState } from "@/app/auth/actions";
import { authClient } from "@/lib/auth/client";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M3.9 7.3l3 2.2C7.8 7.4 9.7 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.7 12 2.7 8.4 2.7 5.3 4.7 3.9 7.3z"
      />
      <path
        fill="#4A90E2"
        d="M12 21.3c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-3.5 0-4.9-2.4-5.1-3.6l-3 2.3c1.4 2.8 4.4 4.8 8.1 4.8z"
      />
      <path
        fill="#FBBC05"
        d="M6.9 14.2c-.2-.6-.4-1.2-.4-1.9s.1-1.3.3-1.9l-3-2.3C3.3 9.4 3 10.7 3 12.3c0 1.5.3 2.9.9 4.1l3-2.2z"
      />
    </svg>
  );
}

export function SignInForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signInWithEmail,
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthPending, startOauth] = useTransition();

  function onGoogle() {
    setOauthError(null);
    startOauth(async () => {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      if (error) setOauthError(error.message ?? "Google sign-in failed");
    });
  }

  const busy = pending || oauthPending;
  const fieldError = state?.error || oauthError;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent-soft/40 disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="relative py-1 text-center text-xs text-muted">
        <span className="absolute inset-x-0 top-1/2 border-t border-border" aria-hidden />
        <span className="relative bg-atmosphere px-3">or</span>
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Email address</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-foreground outline-none ring-accent transition focus:ring-2"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="flex items-center justify-between font-medium text-foreground">
            Password
          </span>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 pr-10 text-foreground outline-none ring-accent transition focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs text-muted hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {fieldError ? <p className="text-sm text-danger">{fieldError}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Continue"}
          {!pending ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-semibold text-foreground hover:text-accent">
          Sign up
        </Link>
      </p>
    </div>
  );
}
