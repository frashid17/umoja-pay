import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { openAdminCheckoutPreview } from "@/app/dashboard/checkout/actions";
import { merchantLogoPublicUrl } from "@/lib/checkout/sessions";
import { countOf, one, q } from "@/lib/db";
import type { KycSubmission, Merchant, Payment } from "@/lib/types";
import { getSessionUser, isPlatformAdmin } from "@/lib/session";

export default async function AdminMerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!(await isPlatformAdmin(user.id, user.email))) redirect("/dashboard");

  const { id } = await params;

  const merchant = one(await q<Merchant>`select * from merchants where id = ${id}`);
  if (!merchant) notFound();

  const logoUrl = merchantLogoPublicUrl(merchant.logo_path);

  const [keyCount, payments, kyc] = await Promise.all([
    countOf`select count(*)::int as count from api_keys where merchant_id = ${id} and revoked_at is null`,
    q<Payment>`
      select * from payments
      where merchant_id = ${id}
      order by created_at desc
      limit 20
    `,
    q<KycSubmission>`
      select * from kyc_submissions
      where merchant_id = ${id}
      order by created_at desc
      limit 5
    `,
  ]);

  return (
    <AppShell variant="admin" title={merchant.name} subtitle={`Merchant ${merchant.id}`}>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={merchant.status} />
        <span className="text-muted">Country {merchant.country}</span>
        <span className="text-muted">{keyCount ?? 0} active keys</span>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-8 w-8 rounded-md border border-border bg-card object-contain p-0.5"
          />
        ) : null}
      </div>

      <form action={openAdminCheckoutPreview} className="mb-8">
        <input type="hidden" name="merchantId" value={merchant.id} />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Preview their checkout
        </button>
        <p className="mt-2 text-xs text-muted">
          Opens a preview session with this merchant’s logo and branding, no charge.
        </p>
      </form>

      <h2 className="font-display text-xl">KYC</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {(kyc ?? []).map((s) => (
          <li key={s.id} className="rounded-md border border-border bg-card p-3">
            <StatusBadge status={s.status} /> {s.legal_name} · {s.registration_number}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-xl">Recent payments</h2>
      {(payments ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted">No payments yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {(payments ?? []).map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {(p.amount / 100).toFixed(2)} {p.currency}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted">
                    {p.method.replace("_", " ")}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-2 text-xs text-muted">{new Date(p.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
