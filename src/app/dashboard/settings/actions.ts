"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import type { CountryCode, CurrencyCode } from "@/lib/types";
import { COUNTRIES, CURRENCIES } from "@/lib/types";

function clean(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

export async function updateBusinessProfileAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Business name is required" };

  const legalName = clean(formData.get("legalName"));
  const website = clean(formData.get("website"));
  const supportEmail = clean(formData.get("supportEmail"));
  const supportPhone = clean(formData.get("supportPhone"));
  const statementEmail = clean(formData.get("statementEmail"));
  const country = String(formData.get("country") ?? ctx.merchant.country) as CountryCode;

  if (!COUNTRIES.some((c) => c.code === country)) {
    return { error: "Invalid country" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("merchants")
    .update({
      name,
      legal_name: legalName,
      website,
      support_email: supportEmail,
      support_phone: supportPhone,
      statement_email: statementEmail,
      country,
    })
    .eq("id", ctx.merchant.id);

  if (error) return { error: error.message };

  await writeAuditLog({
    merchantId: ctx.merchant.id,
    actorUserId: user.id,
    action: "merchant.profile_updated",
    entityType: "merchant",
    entityId: ctx.merchant.id,
    metadata: { name, country },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveSettlementAccountAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const accountName = String(formData.get("accountName") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const branchCode = clean(formData.get("branchCode"));
  const mobileMoneyPhone = clean(formData.get("mobileMoneyPhone"));
  const currency = String(formData.get("currency") ?? "KES") as CurrencyCode;
  const country = String(formData.get("country") ?? ctx.merchant.country) as CountryCode;

  if (!accountName || !bankName || !accountNumber) {
    return { error: "Account name, bank, and account number are required" };
  }
  if (!CURRENCIES.includes(currency)) return { error: "Invalid currency" };
  if (!COUNTRIES.some((c) => c.code === country)) return { error: "Invalid country" };

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("settlement_accounts")
    .select("id")
    .eq("merchant_id", ctx.merchant.id)
    .maybeSingle();

  const payload = {
    merchant_id: ctx.merchant.id,
    account_name: accountName,
    bank_name: bankName,
    account_number: accountNumber,
    branch_code: branchCode,
    mobile_money_phone: mobileMoneyPhone,
    currency,
    country,
  };

  const { error } = existing
    ? await supabase.from("settlement_accounts").update(payload).eq("id", existing.id)
    : await supabase.from("settlement_accounts").insert(payload);

  if (error) return { error: error.message };

  await writeAuditLog({
    merchantId: ctx.merchant.id,
    actorUserId: user.id,
    action: "settlement_account.upserted",
    entityType: "settlement_account",
    entityId: existing?.id ?? ctx.merchant.id,
    metadata: { bankName, currency, country },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settlements");
  return { ok: true };
}
