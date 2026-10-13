import "server-only";

import { isUniqueViolation, one, q } from "@/lib/db";
import { sumLineItems } from "@/lib/invoices/format";
import type {
  ApiKeyMode,
  CurrencyCode,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
} from "@/lib/types";

export type { Invoice };
export {
  effectiveInvoiceStatus,
  formatInvoiceMoney,
  invoiceStatusLabel,
  invoiceStatusTone,
  sumLineItems,
} from "@/lib/invoices/format";

export type CreateInvoiceInput = {
  merchantId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  currency: CurrencyCode;
  lineItems: InvoiceLineItem[];
  memo?: string | null;
  dueDate?: string | null;
  status?: Extract<InvoiceStatus, "draft" | "open">;
  mode?: ApiKeyMode;
};

function slugify(seed: string) {
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "inv"}-${suffix}`;
}

function nextInvoiceNumber(merchantId: string, seq: number) {
  const stamp = new Date().toISOString().slice(0, 7).replace("-", "");
  return `INV-${stamp}-${String(seq).padStart(4, "0")}`;
}

function normalizeInvoice(row: Invoice): Invoice {
  const items = Array.isArray(row.line_items) ? row.line_items : [];
  return {
    ...row,
    line_items: items.map((item) => ({
      description: String(item.description ?? ""),
      quantity: Number(item.quantity) || 0,
      unit_amount: Number(item.unit_amount) || 0,
    })),
  };
}

export async function createInvoice(input: CreateInvoiceInput) {
  if (!input.lineItems.length) throw new Error("Add at least one line item");
  const amount = sumLineItems(input.lineItems);
  if (amount < 1) throw new Error("Invoice total must be greater than zero");

  const countRows = await q<{ count: number }>`
    select count(*)::int as count from invoices where merchant_id = ${input.merchantId}
  `;
  const seq = (countRows[0]?.count ?? 0) + 1;

  for (let attempt = 0; attempt < 5; attempt++) {
    const number = nextInvoiceNumber(input.merchantId, seq + attempt);
    const slug = slugify(number);
    try {
      const row = one(
        await q<Invoice>`
          insert into invoices (
            merchant_id, slug, number, customer_name, customer_email, customer_phone,
            currency, amount, line_items, memo, due_date, status, mode
          )
          values (
            ${input.merchantId},
            ${slug},
            ${number},
            ${input.customerName},
            ${input.customerEmail ?? null},
            ${input.customerPhone ?? null},
            ${input.currency}::currency_code,
            ${amount},
            ${JSON.stringify(input.lineItems)}::jsonb,
            ${input.memo ?? null},
            ${input.dueDate ?? null}::date,
            ${(input.status ?? "open")}::invoice_status,
            ${input.mode ?? "test"}::api_key_mode
          )
          returning *
        `,
      );
      if (row) return normalizeInvoice(row);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new Error("Could not allocate an invoice number");
}

export async function listInvoices(merchantId: string) {
  const rows = await q<Invoice>`
    select * from invoices
    where merchant_id = ${merchantId}
    order by created_at desc
  `;
  return rows.map(normalizeInvoice);
}

export async function getInvoiceBySlug(slug: string) {
  const row = one(
    await q<Invoice>`
      select * from invoices
      where slug = ${slug} and status in ('open', 'paid')
    `,
  );
  return row ? normalizeInvoice(row) : null;
}

export async function getInvoiceById(id: string, merchantId: string) {
  const row = one(
    await q<Invoice>`
      select * from invoices
      where id = ${id} and merchant_id = ${merchantId}
    `,
  );
  return row ? normalizeInvoice(row) : null;
}

export async function voidInvoice(id: string, merchantId: string) {
  const row = one(
    await q<Invoice>`
      update invoices
      set status = 'void'
      where id = ${id}
        and merchant_id = ${merchantId}
        and status in ('draft', 'open')
      returning *
    `,
  );
  return row ? normalizeInvoice(row) : null;
}

export async function markInvoicePaid(input: {
  invoiceId: string;
  merchantId: string;
  paymentId: string;
}) {
  const row = one(
    await q<Invoice>`
      update invoices
      set status = 'paid',
          payment_id = ${input.paymentId},
          paid_at = now()
      where id = ${input.invoiceId}
        and merchant_id = ${input.merchantId}
        and status = 'open'
      returning *
    `,
  );
  return row ? normalizeInvoice(row) : null;
}
