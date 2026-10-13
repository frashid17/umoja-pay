import { writeAuditLog } from "@/lib/audit";
import { getAppOrigin } from "@/lib/app-url";
import { isUniqueViolation, one, q } from "@/lib/db";
import { getAdapterForMethod, serializePayment } from "@/lib/payments/adapter";
import { isPaystackConfigured } from "@/lib/paystack/client";
import { dispatchPaymentWebhook } from "@/lib/webhooks";
import type { ApiKeyMode, CurrencyCode, Payment, PaymentMethod } from "@/lib/types";

export type CreatePaymentInput = {
  merchantId: string;
  mode: ApiKeyMode;
  amount: number;
  currency: CurrencyCode;
  method?: PaymentMethod;
  phone?: string | null;
  cardLast4?: string;
  email?: string | null;
  reference?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  sandboxOutcome?: "succeeded" | "failed";
  actorKeyId?: string;
  callbackUrl?: string;
};

export type CreatePaymentResult = {
  payment: Payment;
  created: boolean;
  accessCode?: string;
  authorizationUrl?: string;
  displayText?: string;
  publicKey?: string | null;
};

async function findIdempotentPayment(merchantId: string, idempotencyKey: string) {
  return one(
    await q<Payment>`
      select * from payments
      where merchant_id = ${merchantId} and idempotency_key = ${idempotencyKey}
    `,
  );
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const method: PaymentMethod = input.method ?? "mpesa_stk";
  const usingPaystack = isPaystackConfigured(input.mode);

  if (method === "mpesa_stk" && !input.phone?.trim()) {
    throw new Error("Phone is required for M-Pesa STK payments");
  }
  if (method === "card" && !usingPaystack && !input.cardLast4?.trim() && !input.sandboxOutcome) {
    throw new Error("Card details are required for card payments");
  }

  if (input.idempotencyKey) {
    const existing = await findIdempotentPayment(input.merchantId, input.idempotencyKey);
    if (existing) return { payment: existing, created: false };
  }

  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    ...(method === "card" && input.cardLast4
      ? { card_last4: input.cardLast4.replace(/\D/g, "").slice(-4) }
      : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(usingPaystack ? { provider: "paystack" } : { provider: "sandbox" }),
  };

  let payment: Payment;
  try {
    const inserted = one(
      await q<Payment>`
        insert into payments (
          merchant_id, amount, currency, method, phone, status, mode, reference,
          metadata, idempotency_key
        )
        values (
          ${input.merchantId},
          ${input.amount},
          ${input.currency}::currency_code,
          ${method}::payment_method,
          ${method === "mpesa_stk" ? input.phone : null},
          'processing',
          ${input.mode}::api_key_mode,
          ${input.reference ?? null},
          ${JSON.stringify(metadata)}::jsonb,
          ${input.idempotencyKey ?? null}
        )
        returning *
      `,
    );
    if (!inserted) throw new Error("Failed to create payment");
    payment = inserted;
  } catch (error) {
    if (isUniqueViolation(error) && input.idempotencyKey) {
      const existing = await findIdempotentPayment(input.merchantId, input.idempotencyKey);
      if (existing) return { payment: existing, created: false };
    }
    throw error;
  }

  const adapter = getAdapterForMethod(method, input.mode);
  const origin = await getAppOrigin().catch(() => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  const result = await adapter.initiate({
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    method,
    phone: payment.phone,
    cardLast4: input.cardLast4,
    email: input.email ?? undefined,
    callbackUrl: input.callbackUrl ?? `${origin}/checkout/paystack/callback`,
    metadata,
    sandboxOutcome: !usingPaystack && input.mode === "test" ? input.sandboxOutcome : undefined,
  });

  const nextMetadata = {
    ...metadata,
    ...(result.displayText ? { display_text: result.displayText } : {}),
    ...(result.accessCode ? { paystack_access_code: result.accessCode } : {}),
    ...(result.authorizationUrl ? { paystack_authorization_url: result.authorizationUrl } : {}),
  };

  const updated = one(
    await q<Payment>`
      update payments
      set status = ${result.status}::payment_status,
          provider_ref = ${result.providerRef},
          failure_reason = ${result.failureReason ?? null},
          metadata = ${JSON.stringify(nextMetadata)}::jsonb
      where id = ${payment.id}
      returning *
    `,
  );
  if (!updated) throw new Error("Failed to update payment");
  const finalPayment = updated;

  await writeAuditLog({
    merchantId: payment.merchant_id,
    action: "payment.created",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      status: finalPayment.status,
      mode: finalPayment.mode,
      amount: finalPayment.amount,
      currency: finalPayment.currency,
      method: finalPayment.method,
      api_key_id: input.actorKeyId,
      provider: usingPaystack ? "paystack" : "sandbox",
    },
  });

  if (finalPayment.status === "succeeded" || finalPayment.status === "failed") {
    void dispatchPaymentWebhook(finalPayment);
  }

  return {
    payment: finalPayment,
    created: true,
    accessCode: result.accessCode,
    authorizationUrl: result.authorizationUrl,
    displayText: result.displayText,
    publicKey: result.publicKey,
  };
}

export async function applyProviderPaymentStatus(input: {
  reference: string;
  status: "succeeded" | "failed" | "processing";
  providerRef?: string;
  failureReason?: string | null;
  cardLast4?: string | null;
  channel?: string | null;
}) {
  let payment = one(await q<Payment>`select * from payments where id = ${input.reference}`);
  if (!payment) {
    payment = one(
      await q<Payment>`select * from payments where provider_ref = ${input.reference}`,
    );
  }
  if (!payment) return null;

  if (payment.status === "succeeded" || payment.status === "refunded" || payment.status === "partially_refunded") {
    if (input.status === "succeeded") return payment;
  }

  const metadata = {
    ...payment.metadata,
    ...(input.cardLast4 ? { card_last4: input.cardLast4 } : {}),
    ...(input.channel ? { paystack_channel: input.channel } : {}),
  };

  const updated = one(
    await q<Payment>`
      update payments
      set status = ${input.status}::payment_status,
          provider_ref = ${input.providerRef ?? payment.provider_ref ?? input.reference},
          failure_reason = ${input.failureReason ?? null},
          metadata = ${JSON.stringify(metadata)}::jsonb
      where id = ${payment.id}
      returning *
    `,
  );
  if (!updated) throw new Error("Failed to update payment");
  const finalPayment = updated;

  if (finalPayment.status === "succeeded" || finalPayment.status === "failed") {
    await writeAuditLog({
      merchantId: finalPayment.merchant_id,
      action: `payment.${finalPayment.status}`,
      entityType: "payment",
      entityId: finalPayment.id,
      metadata: { provider: "paystack" },
    });
    void dispatchPaymentWebhook(finalPayment);

    const checkoutId =
      typeof finalPayment.metadata?.checkout_session_id === "string"
        ? finalPayment.metadata.checkout_session_id
        : null;
    if (checkoutId && finalPayment.status === "succeeded") {
      const { markCheckoutCompleted } = await import("@/lib/checkout/sessions");
      await markCheckoutCompleted(checkoutId, finalPayment.id).catch(() => null);
    }
  }

  return finalPayment;
}

export async function getPayment(merchantId: string, paymentId: string) {
  return one(
    await q<Payment>`
      select * from payments
      where id = ${paymentId} and merchant_id = ${merchantId}
    `,
  );
}

export async function getPaymentById(paymentId: string) {
  return one(await q<Payment>`select * from payments where id = ${paymentId}`);
}

export async function listPayments(
  merchantId: string,
  opts: { limit?: number; startingAfter?: string; mode?: ApiKeyMode } = {},
) {
  const limit = Math.min(opts.limit ?? 20, 100);
  let cursor: string | null = null;

  if (opts.startingAfter) {
    const row = one(
      await q<{ created_at: string }>`
        select created_at from payments
        where id = ${opts.startingAfter} and merchant_id = ${merchantId}
      `,
    );
    cursor = row?.created_at ?? null;
  }

  let rows: Payment[];
  if (opts.mode && cursor) {
    rows = await q<Payment>`
      select * from payments
      where merchant_id = ${merchantId}
        and mode = ${opts.mode}::api_key_mode
        and created_at < ${cursor}::timestamptz
      order by created_at desc
      limit ${limit + 1}
    `;
  } else if (opts.mode) {
    rows = await q<Payment>`
      select * from payments
      where merchant_id = ${merchantId} and mode = ${opts.mode}::api_key_mode
      order by created_at desc
      limit ${limit + 1}
    `;
  } else if (cursor) {
    rows = await q<Payment>`
      select * from payments
      where merchant_id = ${merchantId} and created_at < ${cursor}::timestamptz
      order by created_at desc
      limit ${limit + 1}
    `;
  } else {
    rows = await q<Payment>`
      select * from payments
      where merchant_id = ${merchantId}
      order by created_at desc
      limit ${limit + 1}
    `;
  }

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    data: items.map(serializePayment),
    has_more: hasMore,
  };
}
