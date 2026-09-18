import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

export default async function AdminPaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!(await isPlatformAdmin(user.id, user.email))) redirect("/dashboard");

  const supabase = createServiceClient();
  const [
    { data: payments },
    { count: total },
    { count: succeeded },
    { count: failed },
    { count: live },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("*, merchants(name)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("payments").select("*", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "succeeded"),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("mode", "live"),
  ]);

  return (
    <AppShell variant="admin" title="Payments" subtitle="Platform-wide payment explorer.">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-4">
        {[
          { label: "Total", value: total ?? 0 },
          { label: "Succeeded", value: succeeded ?? 0 },
          { label: "Failed", value: failed ?? 0 },
          { label: "Live", value: live ?? 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
              {item.label}
            </p>
            <p className="font-display mt-1 text-2xl font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {(payments ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center text-sm text-muted">
          No payments on the platform yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {(payments ?? []).map((p) => {
            const merchantName =
              p.merchants && typeof p.merchants === "object" && "name" in p.merchants
                ? String((p.merchants as { name: string }).name)
                : p.merchant_id.slice(0, 8);

            return (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-card px-4 py-4 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{merchantName}</p>
                    <p className="mt-1 font-display text-lg font-bold tracking-tight text-foreground">
                      {(p.amount / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      <span className="text-sm font-medium text-muted">{p.currency}</span>
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Mode</dt>
                    <dd className="mt-0.5 capitalize text-foreground">{p.mode}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Phone</dt>
                    <dd className="mt-0.5 truncate font-mono text-foreground">{p.phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Created</dt>
                    <dd className="mt-0.5 text-foreground">
                      {new Date(p.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Payment ID</dt>
                    <dd className="mt-0.5 truncate font-mono text-foreground" title={p.id}>
                      {p.id.slice(0, 12)}…
                    </dd>
                  </div>
                </dl>

                {p.failure_reason || p.reference ? (
                  <p className="mt-3 text-xs text-muted">
                    {p.reference ? `Ref ${p.reference}` : null}
                    {p.reference && p.failure_reason ? " · " : null}
                    {p.failure_reason ?? null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
