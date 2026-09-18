import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { submitKyc } from "@/app/dashboard/kyc/actions";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { COUNTRIES } from "@/lib/types";

export default async function KycPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const ctx = await getUserMerchant(user.id);
  if (!ctx) redirect("/onboarding");

  const supabase = createServiceClient();
  const { data: submissions } = await supabase
    .from("kyc_submissions")
    .select("*")
    .eq("merchant_id", ctx.merchant.id)
    .order("created_at", { ascending: false });

  const canSubmit =
    ctx.merchant.status === "draft" ||
    ctx.merchant.status === "rejected" ||
    !(submissions ?? []).some((s) => s.status === "pending");

  return (
    <AppShell
      variant="merchant"
      title="KYC onboarding"
      subtitle="Submit business identity documents for live API access."
    >
      <div className="mb-6">
        <StatusBadge status={ctx.merchant.status} />
      </div>

      {canSubmit ? (
        <form action={submitKyc} className="max-w-xl space-y-4 rounded-lg border border-border bg-card p-5">
          <label className="block space-y-1 text-sm">
            <span>Legal business name</span>
            <input
              name="legalName"
              required
              defaultValue={ctx.merchant.legal_name ?? ctx.merchant.name}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Registration number</span>
            <input
              name="registrationNumber"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Address</span>
            <input
              name="addressLine"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>City</span>
              <input
                name="city"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Country</span>
              <select
                name="country"
                defaultValue={ctx.merchant.country}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span>Directors summary</span>
            <textarea
              name="directorsSummary"
              required
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder="Full names of directors / beneficial owners"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Registration certificate (PDF/image)</span>
            <input name="document" type="file" accept=".pdf,image/*" className="w-full text-sm" />
          </label>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Submit for review
          </button>
        </form>
      ) : (
        <p className="text-muted">A KYC submission is already pending review.</p>
      )}

      <div className="mt-10">
        <h2 className="font-display text-xl">Submission history</h2>
        <ul className="mt-4 space-y-3">
          {(submissions ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={s.status} />
                <span className="text-muted">{new Date(s.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2">{s.legal_name}</p>
              {s.review_notes ? (
                <p className="mt-1 text-muted">Review notes: {s.review_notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
