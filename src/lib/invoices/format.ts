import type { Invoice, InvoiceLineItem, InvoiceStatus } from "@/lib/types";

export function formatInvoiceMoney(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  return `${major.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function sumLineItems(items: InvoiceLineItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_amount, 0);
}

export function invoiceStatusLabel(invoice: Pick<Invoice, "status" | "due_date">): string {
  if (invoice.status === "open" && invoice.due_date) {
    const due = new Date(`${invoice.due_date}T23:59:59`);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) return "Overdue";
  }
  switch (invoice.status) {
    case "draft":
      return "Draft";
    case "open":
      return "Open";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    default:
      return invoice.status;
  }
}

export function invoiceStatusTone(status: InvoiceStatus | "overdue"): string {
  switch (status) {
    case "paid":
      return "text-emerald-700 dark:text-emerald-400";
    case "void":
      return "text-muted";
    case "draft":
      return "text-muted";
    case "overdue":
      return "text-danger";
    default:
      return "text-foreground";
  }
}

export function effectiveInvoiceStatus(
  invoice: Pick<Invoice, "status" | "due_date">,
): InvoiceStatus | "overdue" {
  if (invoice.status === "open" && invoice.due_date) {
    const due = new Date(`${invoice.due_date}T23:59:59`);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) return "overdue";
  }
  return invoice.status;
}
