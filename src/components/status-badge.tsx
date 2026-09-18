import type { MerchantStatus, PaymentStatus } from "@/lib/types";

const styles: Record<string, string> = {
  draft: "bg-sand text-muted ring-1 ring-border",
  pending_kyc: "bg-warning/15 text-warning ring-1 ring-warning/25",
  pending: "bg-warning/15 text-warning ring-1 ring-warning/25",
  active: "bg-success/15 text-success ring-1 ring-success/25",
  approved: "bg-success/15 text-success ring-1 ring-success/25",
  succeeded: "bg-success/15 text-success ring-1 ring-success/25",
  paid: "bg-success/15 text-success ring-1 ring-success/25",
  rejected: "bg-danger/15 text-danger ring-1 ring-danger/25",
  failed: "bg-danger/15 text-danger ring-1 ring-danger/25",
  suspended: "bg-danger/15 text-danger ring-1 ring-danger/25",
  processing: "bg-accent-soft text-accent ring-1 ring-accent/25",
  canceled: "bg-border/60 text-muted ring-1 ring-border",
};

export function StatusBadge({
  status,
}: {
  status: MerchantStatus | PaymentStatus | string;
  /** @deprecated Badges are theme-aware; prop ignored */
  onDark?: boolean;
}) {
  const style = styles[status] ?? styles.draft;

  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
