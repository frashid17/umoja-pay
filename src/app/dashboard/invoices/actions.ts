"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { getAppOrigin } from "@/lib/app-url";
import { createInvoice, voidInvoice } from "@/lib/invoices";
import { getSessionUser, getUserMerchant } from "@/lib/session";
import type { CurrencyCode, InvoiceLineItem } from "@/lib/types";
import { CURRENCIES } from "@/lib/types";

function clean(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function parseAmountToMinor(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major) || major < 0) return null;
  return Math.round(major * 100);
}

export async function createInvoiceAction(
  formData: FormData,
): Promise<{ error?: string; url?: string; id?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const customerName = clean(formData.get("customerName"));
  if (!customerName) return { error: "Customer name is required" };

  const customerEmail = clean(formData.get("customerEmail"));
  const customerPhone = clean(formData.get("customerPhone"));
  const memo = clean(formData.get("memo"));
  const dueDate = clean(formData.get("dueDate"));

  const currency = String(formData.get("currency") ?? "KES") as CurrencyCode;
  if (!CURRENCIES.includes(currency)) return { error: "Invalid currency" };

  const modeRaw = String(formData.get("mode") ?? "test");
  const mode = modeRaw === "live" ? "live" : "test";
  if (mode === "live" && ctx.merchant.status !== "active") {
    return { error: "Live invoices require an active merchant (complete KYC first)" };
  }

  const statusRaw = String(formData.get("status") ?? "open");
  const status = statusRaw === "draft" ? "draft" : "open";

  const descriptions = formData.getAll("itemDescription").map(String);
  const quantities = formData.getAll("itemQuantity").map(String);
  const amounts = formData.getAll("itemAmount").map(String);
  if (!descriptions.length) return { error: "Add at least one line item" };

  const lineItems: InvoiceLineItem[] = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i]?.trim();
    if (!description) return { error: `Line ${i + 1}: description is required` };
    const quantity = Number(quantities[i] ?? "1");
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `Line ${i + 1}: enter a valid quantity` };
    }
    const unitAmount = parseAmountToMinor(amounts[i] ?? "");
    if (unitAmount === null) return { error: `Line ${i + 1}: enter a valid amount` };
    lineItems.push({
      description,
      quantity,
      unit_amount: unitAmount,
    });
  }

  try {
    const invoice = await createInvoice({
      merchantId: ctx.merchant.id,
      customerName,
      customerEmail,
      customerPhone,
      currency,
      lineItems,
      memo,
      dueDate,
      status,
      mode,
    });

    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "invoice.created",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: {
        number: invoice.number,
        amount: invoice.amount,
        currency,
        status: invoice.status,
        mode,
      },
    });

    revalidatePath("/dashboard/invoices");
    const origin = await getAppOrigin();
    return {
      url: `${origin}/invoice/${invoice.slug}`,
      id: invoice.id,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create invoice" };
  }
}

export async function voidInvoiceAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing invoice" };

  try {
    const invoice = await voidInvoice(id, ctx.merchant.id);
    if (!invoice) return { error: "Invoice cannot be voided" };

    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "invoice.voided",
      entityType: "invoice",
      entityId: id,
      metadata: { number: invoice.number },
    });

    revalidatePath("/dashboard/invoices");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not void invoice" };
  }
}
