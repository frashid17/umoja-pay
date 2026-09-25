"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { cancelRefund, createRefund, updateRefund } from "@/lib/payments/refunds";

function revalidateRefundPaths() {
  revalidatePath("/dashboard/refunds");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/balances");
}

/** Accept major units (150.00). Bare integers treated as major units. */
function parseAmountToMinor(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major) || major <= 0) return null;
  return Math.round(major * 100);
}

export async function createRefundAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; id?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  if (!paymentId) return { error: "Payment is required" };

  const amount = parseAmountToMinor(String(formData.get("amount") ?? ""));
  if (amount === null) return { error: "Enter a valid refund amount" };

  const reason = String(formData.get("reason") ?? "").trim() || null;

  try {
    const refund = await createRefund({
      merchantId: ctx.merchant.id,
      paymentId,
      amount,
      reason,
      actorUserId: user.id,
    });
    revalidateRefundPaths();
    return { ok: true, id: refund.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create refund" };
  }
}

export async function updateRefundAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const refundId = String(formData.get("refundId") ?? "").trim();
  if (!refundId) return { error: "Refund is required" };

  const reasonRaw = formData.get("reason");
  const amountRaw = formData.get("amount");

  const patch: {
    merchantId: string;
    refundId: string;
    actorUserId: string;
    reason?: string | null;
    amount?: number;
  } = {
    merchantId: ctx.merchant.id,
    refundId,
    actorUserId: user.id,
  };

  if (reasonRaw !== null) {
    patch.reason = String(reasonRaw).trim() || null;
  }

  if (amountRaw !== null && String(amountRaw).trim() !== "") {
    const amount = parseAmountToMinor(String(amountRaw));
    if (amount === null) return { error: "Enter a valid refund amount" };
    patch.amount = amount;
  }

  try {
    await updateRefund(patch);
    revalidateRefundPaths();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update refund" };
  }
}

export async function cancelRefundAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };
  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { error: "No merchant" };

  const refundId = String(formData.get("refundId") ?? "").trim();
  if (!refundId) return { error: "Refund is required" };

  try {
    await cancelRefund({
      merchantId: ctx.merchant.id,
      refundId,
      actorUserId: user.id,
    });
    revalidateRefundPaths();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not cancel refund" };
  }
}
