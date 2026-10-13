import { writeAuditLog } from "@/lib/audit";
import { one, q } from "@/lib/db";
import { getAdapterForMethod } from "@/lib/payments/adapter";
import { dispatchRefundWebhook } from "@/lib/webhooks";
import type { Payment, PaymentStatus, Refund } from "@/lib/types";

const REFUNDABLE: PaymentStatus[] = ["succeeded", "partially_refunded"];

async function refundedAmountForPayment(
  paymentId: string,
  opts?: { excludeRefundId?: string; statuses?: Refund["status"][] },
) {
  const statuses = opts?.statuses ?? ["pending", "processing", "succeeded"];
  const rows = await q<Pick<Refund, "id" | "amount" | "status">>`
    select id, amount, status from refunds
    where payment_id = ${paymentId}
      and status::text = any(${statuses})
  `;
  return rows
    .filter((r) => r.id !== opts?.excludeRefundId)
    .reduce((sum, r) => sum + r.amount, 0);
}

async function syncPaymentRefundStatus(payment: Payment) {
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

  const row = one(
    await q<Payment>`
      update payments set status = ${next}::payment_status
      where id = ${payment.id}
      returning *
    `,
  );
  if (!row) throw new Error("Failed to update payment refund status");
  return row;
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
  const payment = one(
    await q<Payment>`
      select * from payments
      where id = ${input.paymentId} and merchant_id = ${input.merchantId}
    `,
  );
  if (!payment) throw new Error("Payment not found");
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

  const metadata = {
    destination:
      payment.method === "card"
        ? {
            type: "card",
            last4: typeof payment.metadata?.card_last4 === "string" ? payment.metadata.card_last4 : null,
          }
        : { type: "mobile_money", phone: payment.phone },
  };

  const inserted = one(
    await q<Refund>`
      insert into refunds (
        merchant_id, payment_id, amount, currency, method, status, mode, reason,
        created_by, metadata
      )
      values (
        ${payment.merchant_id},
        ${payment.id},
        ${Math.round(input.amount)},
        ${payment.currency}::currency_code,
        ${payment.method}::payment_method,
        'processing',
        ${payment.mode}::api_key_mode,
        ${input.reason?.trim() || null},
        ${input.actorUserId ?? null},
        ${JSON.stringify(metadata)}::jsonb
      )
      returning *
    `,
  );
  if (!inserted) throw new Error("Failed to create refund");

  const adapter = getAdapterForMethod(payment.method, payment.mode);
  const cardLast4 =
    typeof payment.metadata?.card_last4 === "string" ? payment.metadata.card_last4 : null;

  const result = await adapter.refund({
    refundId: inserted.id,
    paymentId: payment.id,
    amount: inserted.amount,
    currency: inserted.currency,
    method: inserted.method,
    phone: payment.phone,
    cardLast4,
    originalProviderRef: payment.provider_ref,
    sandboxOutcome: payment.mode === "test" ? input.sandboxOutcome : undefined,
  });

  const updated = one(
    await q<Refund>`
      update refunds
      set status = ${result.status}::refund_status,
          provider_ref = ${result.providerRef},
          failure_reason = ${result.failureReason ?? null}
      where id = ${inserted.id}
      returning *
    `,
  );
  if (!updated) throw new Error("Failed to update refund");

  await syncPaymentRefundStatus(payment);

  await writeAuditLog({
    merchantId: payment.merchant_id,
    actorUserId: input.actorUserId,
    action: "refund.created",
    entityType: "refund",
    entityId: updated.id,
    metadata: {
      payment_id: payment.id,
      amount: updated.amount,
      currency: updated.currency,
      method: updated.method,
      status: updated.status,
    },
  });

  void dispatchRefundWebhook(updated);
  return updated;
}

export type UpdateRefundInput = {
  merchantId: string;
  refundId: string;
  amount?: number;
  reason?: string | null;
  actorUserId?: string | null;
};

export async function updateRefund(input: UpdateRefundInput) {
  const refund = one(
    await q<Refund>`
      select * from refunds
      where id = ${input.refundId} and merchant_id = ${input.merchantId}
    `,
  );
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "canceled") {
    throw new Error("Canceled refunds cannot be edited");
  }

  let nextReason = refund.reason;
  let nextAmount = refund.amount;
  let changed = false;

  if (input.reason !== undefined) {
    nextReason = input.reason?.trim() || null;
    changed = true;
  }

  if (input.amount !== undefined && input.amount !== refund.amount) {
    if (refund.status === "succeeded") {
      throw new Error("Succeeded refunds cannot change amount. Create another partial refund");
    }
    if (refund.status === "failed") {
      throw new Error("Failed refunds cannot change amount. Create a new refund");
    }
    if (!Number.isFinite(input.amount) || input.amount < 1) {
      throw new Error("Refund amount must be a positive integer (minor units)");
    }

    const payment = one(
      await q<Payment>`
        select * from payments
        where id = ${refund.payment_id} and merchant_id = ${input.merchantId}
      `,
    );
    if (!payment) throw new Error("Payment not found");

    const already = await refundedAmountForPayment(payment.id, {
      excludeRefundId: refund.id,
    });
    const remaining = payment.amount - already;
    if (input.amount > remaining) {
      throw new Error(
        `Refund exceeds remaining refundable amount (${remaining} ${payment.currency} left)`,
      );
    }
    nextAmount = Math.round(input.amount);
    changed = true;
  }

  if (!changed) return refund;

  const updated = one(
    await q<Refund>`
      update refunds
      set reason = ${nextReason}, amount = ${nextAmount}
      where id = ${refund.id}
      returning *
    `,
  );
  if (!updated) throw new Error("Failed to update refund");

  await writeAuditLog({
    merchantId: input.merchantId,
    actorUserId: input.actorUserId,
    action: "refund.updated",
    entityType: "refund",
    entityId: updated.id,
    metadata: {
      ...(input.reason !== undefined ? { reason: nextReason } : {}),
      ...(nextAmount !== refund.amount ? { amount: nextAmount } : {}),
    },
  });

  return updated;
}

export async function cancelRefund(input: {
  merchantId: string;
  refundId: string;
  actorUserId?: string | null;
}) {
  const refund = one(
    await q<Refund>`
      select * from refunds
      where id = ${input.refundId} and merchant_id = ${input.merchantId}
    `,
  );
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "succeeded") {
    throw new Error("Succeeded refunds cannot be canceled");
  }
  if (refund.status === "canceled") return refund;

  const updated = one(
    await q<Refund>`
      update refunds set status = 'canceled'
      where id = ${refund.id}
      returning *
    `,
  );
  if (!updated) throw new Error("Failed to cancel refund");

  const payment = one(await q<Payment>`select * from payments where id = ${refund.payment_id}`);
  if (payment) await syncPaymentRefundStatus(payment);

  await writeAuditLog({
    merchantId: input.merchantId,
    actorUserId: input.actorUserId,
    action: "refund.canceled",
    entityType: "refund",
    entityId: updated.id,
    metadata: {},
  });

  return updated;
}

export async function listRefunds(merchantId: string, limit = 50) {
  return q<Refund>`
    select * from refunds
    where merchant_id = ${merchantId}
    order by created_at desc
    limit ${limit}
  `;
}

export async function getRefundableRemaining(paymentId: string, merchantId: string) {
  const payment = one(
    await q<Payment>`
      select * from payments
      where id = ${paymentId} and merchant_id = ${merchantId}
    `,
  );
  if (!payment) return null;

  if (!REFUNDABLE.includes(payment.status) && payment.status !== "refunded") {
    return { payment, remaining: 0, refunded: 0 };
  }

  const refunded = await refundedAmountForPayment(payment.id);
  return {
    payment,
    remaining: Math.max(0, payment.amount - refunded),
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
