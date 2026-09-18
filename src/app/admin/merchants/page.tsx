import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

const countryLabels: Record<string, string> = {
  KE: "Kenya",
  TZ: "Tanzania",
  UG: "Uganda",
  RW: "Rwanda",
};

export default async function AdminMerchantsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!(await isPlatformAdmin(user.id, user.email))) redirect("/dashboard");

  const supabase = createServiceClient();
  const { data: merchants } = await supabase
    .from("merchants")
    .select("*")
    .order("created_at", { ascending: false });

  const ids = (merchants ?? []).map((m) => m.id);
  const [{ data: paymentRows }, { data: keyRows }, { data: kycRows }] = await Promise.all([
    ids.length
      ? supabase.from("payments").select("merchant_id, status").in("merchant_id", ids)
      : Promise.resolve({ data: [] as { merchant_id: string; status: string }[] }),
    ids.length
      ? supabase
          .from("api_keys")
          .select("merchant_id")
          .in("merchant_id", ids)
          .is("revoked_at", null)
      : Promise.resolve({ data: [] as { merchant_id: string }[] }),
    ids.length
      ? supabase
          .from("kyc_submissions")
          .select("merchant_id, status")
          .in("merchant_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { merchant_id: string; status: string }[] }),
  ]);

  const paymentCountByMerchant = new Map<string, number>();
  for (const row of paymentRows ?? []) {
    paymentCountByMerchant.set(
      row.merchant_id,
      (paymentCountByMerchant.get(row.merchant_id) ?? 0) + 1,
    );
  }
  const keyCountByMerchant = new Map<string, number>();
  for (const row of keyRows ?? []) {
    keyCountByMerchant.set(row.merchant_id, (keyCountByMerchant.get(row.merchant_id) ?? 0) + 1);
  }
  const latestKycByMerchant = new Map<string, string>();
  for (const row of kycRows ?? []) {
    if (!latestKycByMerchant.has(row.merchant_id)) {
      latestKycByMerchant.set(row.merchant_id, row.status);
    }
  }

  const counts = {
    total: merchants?.length ?? 0,
    active: (merchants ?? []).filter((m) => m.status === "active").length,
    pending: (merchants ?? []).filter((m) => m.status === "pending_kyc").length,
    draft: (merchants ?? []).filter((m) => m.status === "draft").length,
  };

  return (
    <AppShell
      variant="admin"
      title="Merchants"
      subtitle="Every business registered on Umoja Pay — status, KYC, keys, and payment volume."
    >
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.total },
          { label: "Active", value: counts.active },
          { label: "Pending KYC", value: counts.pending },
          { label: "Draft", value: counts.draft },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{item.label}</p>
            <p className="font-display mt-1 text-2xl font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {(merchants ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted">
          No merchants yet.
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {(merchants ?? []).map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-semibold text-foreground">{m.name}</p>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {countryLabels[m.country] ?? m.country}
                  {m.legal_name ? ` · ${m.legal_name}` : ""}
                  {" · "}
                  Joined {new Date(m.created_at).toLocaleDateString()}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {keyCountByMerchant.get(m.id) ?? 0} keys ·{" "}
                  {paymentCountByMerchant.get(m.id) ?? 0} payments
                  {latestKycByMerchant.get(m.id)
                    ? ` · KYC ${latestKycByMerchant.get(m.id)}`
                    : " · No KYC yet"}
                </p>
              </div>
              <Link
                href={`/admin/merchants/${m.id}`}
                className="shrink-0 text-sm font-medium text-accent hover:underline"
              >
                Open merchant →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
