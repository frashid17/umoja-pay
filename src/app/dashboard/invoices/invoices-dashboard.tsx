"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createInvoiceAction,
  voidInvoiceAction,
} from "@/app/dashboard/invoices/actions";
import {
  effectiveInvoiceStatus,
  formatInvoiceMoney,
  invoiceStatusLabel,
  invoiceStatusTone,
  sumLineItems,
} from "@/lib/invoices/format";
import type { Invoice, Merchant } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent";

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  amount: string;
};

type InvoiceRow = Invoice & { payUrl: string };

function parseMajor(raw: string) {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function InvoicesDashboard({
  merchant,
  invoices,
}: {
  merchant: Merchant;
  invoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [currency, setCurrency] = useState("KES");
  const [lines, setLines] = useState<LineDraft[]>([
    { key: "l0", description: "", quantity: "1", amount: "" },
  ]);

  const previewTotal = useMemo(
    () =>
      sumLineItems(
        lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity) || 0,
          unit_amount: parseMajor(line.amount),
        })),
      ),
    [lines],
  );

  function resetForm() {
    setCurrency("KES");
    setLines([{ key: "l0", description: "", quantity: "1", amount: "" }]);
  }

  function openCreate() {
    resetForm();
    setMsg(null);
    setOpen(true);
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  const openCount = invoices.filter((i) => i.status === "open").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;

  return (
    <div className="relative space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {openCount} open · {paidCount} paid · {invoices.length} total
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Create invoice
        </button>
      </div>

      {msg && !open ? <p className="text-sm text-muted">{msg}</p> : null}

      {invoices.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <h2 className="font-display text-xl font-bold text-foreground">No invoices yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create an invoice for a customer with line items and a due date. Share the link so they can
            pay online.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Create your first invoice
          </button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[7rem_1fr_1fr_auto_auto] gap-4 border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-muted lg:grid">
            <span>Number</span>
            <span>Customer</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-border">
            {invoices.map((invoice) => {
              const tone = effectiveInvoiceStatus(invoice);
              return (
                <li
                  key={invoice.id}
                  className="grid gap-3 px-5 py-4 lg:grid-cols-[7rem_1fr_1fr_auto_auto] lg:items-center"
                >
                  <div>
                    <p className="font-mono text-sm text-foreground">{invoice.number}</p>
                    <p className="text-xs text-muted lg:hidden">{invoiceStatusLabel(invoice)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{invoice.customer_name}</p>
                    <p className="truncate text-xs text-muted">
                      {invoice.customer_email || invoice.customer_phone || "No contact"}
                    </p>
                  </div>
                  <div className="text-sm text-foreground">
                    {formatInvoiceMoney(invoice.amount, invoice.currency)}
                    {invoice.due_date ? (
                      <p className="text-xs text-muted">Due {invoice.due_date}</p>
                    ) : null}
                  </div>
                  <p className={`text-sm font-medium ${invoiceStatusTone(tone)}`}>
                    {invoiceStatusLabel(invoice)}
                  </p>
                  <div className="flex items-center gap-2 lg:justify-end">
                    <Link
                      href={invoice.payUrl}
                      target="_blank"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40"
                    >
                      Open
                    </Link>
                    {invoice.status === "open" || invoice.status === "draft" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const fd = new FormData();
                            fd.set("id", invoice.id);
                            const res = await voidInvoiceAction(fd);
                            if (res.error) {
                              setMsg(res.error);
                              return;
                            }
                            setMsg("Invoice voided");
                            router.refresh();
                          });
                        }}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:text-danger disabled:opacity-60"
                      >
                        Void
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => !pending && setOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-xl font-bold text-foreground">Create invoice</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="text-sm text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              action={(fd) => {
                start(async () => {
                  const res = await createInvoiceAction(fd);
                  if (res.error) {
                    setMsg(res.error);
                    return;
                  }
                  setMsg("Invoice created");
                  setOpen(false);
                  resetForm();
                  router.refresh();
                });
              }}
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {msg && open ? <p className="text-sm text-danger">{msg}</p> : null}

                <label className="block space-y-1.5 text-sm">
                  <span className="text-foreground">
                    Customer name <span className="text-danger">*</span>
                  </span>
                  <input name="customerName" required placeholder="Acme Ltd" className={inputClass} />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-foreground">Email</span>
                    <input
                      name="customerEmail"
                      type="email"
                      placeholder="billing@acme.com"
                      className={inputClass}
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-foreground">Phone</span>
                    <input
                      name="customerPhone"
                      placeholder="2547…"
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-foreground">Due date</span>
                    <input name="dueDate" type="date" className={inputClass} />
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-foreground">Currency</span>
                    <select
                      name="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={inputClass}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Line items</p>
                  {lines.map((line, index) => (
                    <div key={line.key} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase tracking-[0.12em] text-muted">
                          Item {index + 1}
                        </span>
                        {lines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLines((rows) => rows.filter((row) => row.key !== line.key))
                            }
                            className="text-xs text-muted hover:text-danger"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <label className="mt-3 block space-y-1 text-sm">
                        <span className="text-muted">Description</span>
                        <input
                          name="itemDescription"
                          required
                          value={line.description}
                          onChange={(e) => updateLine(line.key, { description: e.target.value })}
                          placeholder="Consulting hours"
                          className={inputClass}
                        />
                      </label>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1 text-sm">
                          <span className="text-muted">Qty</span>
                          <input
                            name="itemQuantity"
                            required
                            inputMode="decimal"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                            className={inputClass}
                          />
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-muted">Unit amount</span>
                          <input
                            name="itemAmount"
                            required
                            inputMode="decimal"
                            value={line.amount}
                            onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                            placeholder="1500"
                            className={inputClass}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setLines((rows) => [
                        ...rows,
                        { key: `l${Date.now()}`, description: "", quantity: "1", amount: "" },
                      ])
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-foreground transition hover:border-accent/50"
                  >
                    <span aria-hidden>+</span> Add line item
                  </button>
                  <p className="text-sm text-muted">
                    Total{" "}
                    <span className="font-medium text-foreground">
                      {formatInvoiceMoney(previewTotal, currency)}
                    </span>
                  </p>
                </div>

                <label className="block space-y-1.5 text-sm">
                  <span className="text-foreground">Memo</span>
                  <textarea
                    name="memo"
                    rows={3}
                    placeholder="Payment terms or notes for the customer"
                    className={inputClass}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-foreground">Status</span>
                    <select name="status" defaultValue="open" className={inputClass}>
                      <option value="open">Open (shareable)</option>
                      <option value="draft">Draft</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span className="text-foreground">Mode</span>
                    <select name="mode" defaultValue="test" className={inputClass}>
                      <option value="test">Test</option>
                      <option value="live" disabled={merchant.status !== "active"}>
                        Live
                        {merchant.status !== "active" ? " (KYC required)" : ""}
                      </option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
                >
                  {pending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
