import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { getAdapterForMethod } from "@/lib/payments/adapter";
import { dispatchRefundWebhook } from "@/lib/webhooks";
import type { Payment, PaymentStatus, Refund } from "@/lib/types";

const REFUNDABLE: PaymentStatus[] = ["succeeded", "partially_refunded"];

async function refundedAmountForPayment(
  paymentId: string,
  opts?: { excludeRefundId?: string; statuses?: Refund["status"][] },
) {
  const supabase = createServiceClient();
  const statuses = opts?.statuses ?? ["pending", "processing", "succeeded"];
  const { data, error } = await supabase
    .from("refunds")
    .select("id, amount, status")
    .eq("payment_id", paymentId)
    .in("status", statuses);

  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.id !== opts?.excludeRefundId)
    .reduce((sum, r) => sum + r.amount, 0);
}

async function syncPaymentRefundStatus(payment: Payment) {
  const supabase = createServiceClient();
  const succeededRefunded = await refundedAmountForPayment(payment.id, {
    statuses: ["succeeded"],
  });

  let next: PaymentStatus = payment.status;
  if (succeededRefunded <= 0) {
    if (payment.status === "partially_refunded" || payment.status === "refunded") {
      next = "succeeded";
    }
  } else if (succeededRefunded >= payment.amount) {
    next = "refunded";
  } else {
    next = "partially_refunded";
  }

  if (next === payment.status) return payment;

  const { data, error } = await supabase
    .from("payments")
    .update({ status: next })
    .eq("id", payment.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Payment;
}

export type CreateRefundInput = {
  merchantId: string;
  paymentId: string;
  amount: number;
  reason?: string | null;
  actorUserId?: string | null;
  sandboxOutcome?: "succeeded" | "failed";
};

export async function createRefund(input: CreateRefundInput) {
  const supabase = createServiceClient();
  const { data: paymentRow, error: payErr } = await supabase
    .from("payments")
    .select("*")
    .eq("id", input.paymentId)
    .eq("merchant_id", input.merchantId)
    .maybeSingle();

  if (payErr) throw payErr;
  if (!paymentRow) throw new Error("Payment not found");

  const payment = paymentRow as Payment;
  if (!REFUNDABLE.includes(payment.status)) {
    throw new Error("Only succeeded payments can be refunded");
  }
  if (!Number.isFinite(input.amount) || input.amount < 1) {
    throw new Error("Refund amount must be a positive integer (minor units)");
  }

  const already = await refundedAmountForPayment(payment.id);
  const remaining = payment.amount - already;
  if (input.amount > remaining) {
    throw new Error(
      `Refund exceeds remaining refundable amount (${remaining} ${payment.currency} left)`,
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("refunds")
    .insert({
      merchant_id: payment.merchant_id,
      payment_id: payment.id,
      amount: Math.round(input.amount),
      currency: payment.currency,
      method: payment.method,
      status: "processing",
      mode: payment.mode,
      reason: input.reason?.trim() || null,
      created_by: input.actorUserId ?? null,
      metadata: {
        destination:
          payment.method === "card"
            ? {
                type: "card",
                last4:
                  typeof payment.metadata?.card_last4 === "string"
                    ? payment.metadata.card_last4
                    : null,
              }
            : { type: "mobile_money", phone: payment.phone },
      },
    })
    .select("*")
    .single();

  if (insertErr) throw insertErr;
  const refund = inserted as Refund;

  const adapter = getAdapterForMethod(payment.method, payment.mode);
  const cardLast4 =
    typeof payment.metadata?.card_last4 === "string" ? payment.metadata.card_last4 : null;

  const result = await adapter.refund({
    refundId: refund.id,
    paymentId: payment.id,
    amount: refund.amount,
    currency: refund.currency,
    method: refund.method,
    phone: payment.phone,
    cardLast4,
    originalProviderRef: payment.provider_ref,
    sandboxOutcome: payment.mode === "test" ? input.sandboxOutcome : undefined,
  });

  const { data: updated, error: updateErr } = await supabase
    .from("refunds")
    .update({
      status: result.status,
      provider_ref: result.providerRef,
      failure_reason: result.failureReason ?? null,
    })
    .eq("id", refund.id)
    .select("*")
    .single();

  if (updateErr) throw updateErr;
  const finalRefund = updated as Refund;

  await syncPaymentRefundStatus(payment);

  await writeAuditLog({
    merchantId: payment.merchant_id,
    actorUserId: input.actorUserId,
    action: "refund.created",
    entityType: "refund",
    entityId: finalRefund.id,
    metadata: {
      payment_id: payment.id,
      amount: finalRefund.amount,
      currency: finalRefund.currency,
      method: finalRefund.method,
      status: finalRefund.status,
    },
  });

  void dispatchRefundWebhook(finalRefund);

  return finalRefund;
}

export type UpdateRefundInput = {
  merchantId: string;
  refundId: string;
  amount?: number;
  reason?: string | null;
  actorUserId?: string | null;
};

export async function updateRefund(input: UpdateRefundInput) {
  const supabase = createServiceClient();
  const { data: existing, error } = await supabase
    .from("refunds")
    .select("*")
    .eq("id", input.refundId)
    .eq("merchant_id", input.merchantId)
    .maybeSingle();

  if (error) throw error;
  if (!existing) throw new Error("Refund not found");
  const refund = existing as Refund;

  if (refund.status === "canceled") {
    throw new Error("Canceled refunds cannot be edited");
  }

  const patch: Record<string, unknown> = {};

  if (input.reason !== undefined) {
    patch.reason = input.reason?.trim() || null;
  }

  if (input.amount !== undefined && input.amount !== refund.amount) {
    if (refund.status === "succeeded") {
      throw new Error("Succeeded refunds cannot change amount — create another partial refund");
    }
    if (refund.status === "failed") {
      throw new Error("Failed refunds cannot change amount — create a new refund");
    }
    if (!Number.isFinite(input.amount) || input.amount < 1) {
      throw new Error("Refund amount must be a positive integer (minor units)");
    }

    const { data: paymentRow, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .eq("id", refund.payment_id)
      .eq("merchant_id", input.merchantId)
      .single();
    if (payErr) throw payErr;
    const payment = paymentRow as Payment;

    const already = await refundedAmountForPayment(payment.id, {
      excludeRefundId: refund.id,
    });
    const remaining = payment.amount - already;
    if (input.amount > remaining) {
      throw new Error(
        `Refund exceeds remaining refundable amount (${remaining} ${payment.currency} left)`,
      );
    }
    patch.amount = Math.round(input.amount);
  }

  if (Object.keys(patch).length === 0) return refund;

  const { data: updated, error: updateErr } = await supabase
    .from("refunds")
    .update(patch)
    .eq("id", refund.id)
    .select("*")
    .single();

  if (updateErr) throw updateErr;
  const finalRefund = updated as Refund;

  await writeAuditLog({
    merchantId: input.merchantId,
    actorUserId: input.actorUserId,
    action: "refund.updated",
    entityType: "refund",
    entityId: finalRefund.id,
    metadata: patch,
  });

  return finalRefund;
}

export async function cancelRefund(input: {
  merchantId: string;
  refundId: string;
  actorUserId?: string | null;
}) {
  const supabase = createServiceClient();
  const { data: existing, error } = await supabase
    .from("refunds")
    .select("*")
    .eq("id", input.refundId)
    .eq("merchant_id", input.merchantId)
    .maybeSingle();

  if (error) throw error;
  if (!existing) throw new Error("Refund not found");
  const refund = existing as Refund;

  if (refund.status === "succeeded") {
    throw new Error("Succeeded refunds cannot be canceled");
  }
  if (refund.status === "canceled") return refund;

  const { data: updated, error: updateErr } = await supabase
    .from("refunds")
    .update({ status: "canceled" })
    .eq("id", refund.id)
    .select("*")
    .single();

  if (updateErr) throw updateErr;
  const finalRefund = updated as Refund;

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", refund.payment_id)
    .maybeSingle();
  if (payment) await syncPaymentRefundStatus(payment as Payment);

  await writeAuditLog({
    merchantId: input.merchantId,
    actorUserId: input.actorUserId,
    action: "refund.canceled",
    entityType: "refund",
    entityId: finalRefund.id,
    metadata: {},
  });

  return finalRefund;
}

export async function listRefunds(merchantId: string, limit = 50) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("refunds")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Refund[];
}

export async function getRefundableRemaining(paymentId: string, merchantId: string) {
  const supabase = createServiceClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw error;
  if (!payment) return null;

  const p = payment as Payment;
  if (!REFUNDABLE.includes(p.status) && p.status !== "refunded") {
    return { payment: p, remaining: 0, refunded: 0 };
  }

  const refunded = await refundedAmountForPayment(p.id);
  return {
    payment: p,
    remaining: Math.max(0, p.amount - refunded),
    refunded,
  };
}

export function serializeRefund(refund: Refund) {
  return {
    id: refund.id,
    payment_id: refund.payment_id,
    amount: refund.amount,
    currency: refund.currency,
    method: refund.method,
    status: refund.status,
    mode: refund.mode,
    reason: refund.reason,
    provider_ref: refund.provider_ref,
    failure_reason: refund.failure_reason,
    metadata: refund.metadata,
    created_at: refund.created_at,
    updated_at: refund.updated_at,
  };
}
