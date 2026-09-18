"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/site-header";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const businessName = String(form.get("businessName") ?? "");
    const country = String(form.get("country") ?? "KE");

    const res = await fetch("/api/internal/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, country }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not create merchant");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-atmosphere">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-foreground">Set up your business</h1>
        <p className="mt-2 text-sm text-muted">
          Tell us about the merchant account you will integrate payments for.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span>Business name</span>
            <input
              name="businessName"
              required
              className="w-full rounded-md border border-border bg-card px-3 py-2"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span>Country</span>
            <select
              name="country"
              defaultValue="KE"
              className="w-full rounded-md border border-border bg-card px-3 py-2"
            >
              <option value="KE">Kenya</option>
              <option value="TZ">Tanzania</option>
              <option value="UG">Uganda</option>
              <option value="RW">Rwanda</option>
            </select>
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {loading ? "Creating…" : "Continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
