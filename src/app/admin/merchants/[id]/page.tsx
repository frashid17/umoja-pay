import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

export default async function AdminMerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!(await isPlatformAdmin(user.id, user.email))) redirect("/dashboard");

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: merchant } = await supabase.from("merchants").select("*").eq("id", id).maybeSingle();
  if (!merchant) notFound();

  const [{ count: keyCount }, { data: payments }, { data: kyc }] = await Promise.all([
    supabase
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", id)
      .is("revoked_at", null),
    supabase
      .from("payments")
      .select("*")
      .eq("merchant_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("kyc_submissions")
      .select("*")
      .eq("merchant_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <AppShell variant="admin" title={merchant.name} subtitle={`Merchant ${merchant.id}`}>
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <StatusBadge status={merchant.status} />
        <span className="text-muted">Country {merchant.country}</span>
        <span className="text-muted">{keyCount ?? 0} active keys</span>
      </div>

      <h2 className="font-display text-xl">KYC</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {(kyc ?? []).map((s) => (
          <li key={s.id} className="rounded-md border border-border bg-card p-3">
            <StatusBadge status={s.status} /> {s.legal_name} · {s.registration_number}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-xl">Recent payments</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-card text-muted">
            <tr>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2">
                  {(p.amount / 100).toFixed(2)} {p.currency}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-3 py-2">{p.phone}</td>
                <td className="px-3 py-2 text-muted">
                  {new Date(p.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
