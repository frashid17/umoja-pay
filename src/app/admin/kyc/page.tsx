import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { reviewKycAction } from "@/app/admin/kyc/actions";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

export default async function AdminKycPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!(await isPlatformAdmin(user.id, user.email))) redirect("/dashboard");

  const supabase = createServiceClient();
  const { data: submissions } = await supabase
    .from("kyc_submissions")
    .select("*, merchants(name), kyc_documents(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const submissionsWithUrls = await Promise.all(
    (submissions ?? []).map(async (s) => {
      const docs = Array.isArray(s.kyc_documents) ? s.kyc_documents : [];
      const docsWithUrls = await Promise.all(
        docs.map(async (d: { id: string; file_name: string; file_path: string }) => {
          const { data } = await supabase.storage
            .from("kyc")
            .createSignedUrl(d.file_path, 60 * 30);
          return { ...d, signed_url: data?.signedUrl ?? null };
        }),
      );
      return { ...s, docsWithUrls };
    }),
  );

  return (
    <AppShell
      variant="admin"
      title="KYC queue"
      subtitle="Approve or reject merchant identity submissions."
    >
      <div className="space-y-6">
        {submissionsWithUrls.length === 0 ? (
          <p className="text-muted">No pending submissions.</p>
        ) : (
          submissionsWithUrls.map((s) => {
            const merchantName =
              s.merchants && typeof s.merchants === "object" && "name" in s.merchants
                ? String((s.merchants as { name: string }).name)
                : s.merchant_id;

            return (
              <article key={s.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl">{merchantName}</h2>
                  <StatusBadge status={s.status} />
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Legal name</dt>
                    <dd>{s.legal_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Registration</dt>
                    <dd>{s.registration_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Address</dt>
                    <dd>
                      {s.address_line}, {s.city}, {s.country}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Directors</dt>
                    <dd>{s.directors_summary}</dd>
                  </div>
                </dl>
                {s.docsWithUrls.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {s.docsWithUrls.map(
                      (d: {
                        id: string;
                        file_name: string;
                        file_path: string;
                        signed_url: string | null;
                      }) => (
                      <li key={d.id}>
                        {d.signed_url ? (
                          <a
                            href={d.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline"
                          >
                            View {d.file_name}
                          </a>
                        ) : (
                          <span className="text-muted">{d.file_name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <form action={reviewKycAction} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="submissionId" value={s.id} />
                  <label className="block grow space-y-1 text-sm">
                    <span>Notes</span>
                    <input
                      name="notes"
                      className="w-full rounded-md border border-border bg-background px-3 py-2"
                    />
                  </label>
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="rounded-md bg-success px-4 py-2 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                </form>
              </article>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
