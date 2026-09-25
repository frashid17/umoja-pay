import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { getAppOrigin } from "@/lib/app-url";
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

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const supabase = createServiceClient();
  const method: PaymentMethod = input.method ?? "mpesa_stk";
  const usingPaystack = isPaystackConfigured(input.mode);

  if (method === "mpesa_stk" && !input.phone?.trim()) {
    throw new Error("Phone is required for M-Pesa STK payments");
  }
  if (method === "card" && !usingPaystack && !input.cardLast4?.trim() && !input.sandboxOutcome) {
    throw new Error("Card details are required for card payments");
  }

  if (input.idempotencyKey) {
    const { data: existing } = await supabase
      .from("payments")
      .select("*")
      .eq("merchant_id", input.merchantId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existing) {
      return { payment: existing as Payment, created: false };
    }
  }

  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    ...(method === "card" && input.cardLast4
      ? { card_last4: input.cardLast4.replace(/\D/g, "").slice(-4) }
      : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(usingPaystack ? { provider: "paystack" } : { provider: "sandbox" }),
  };

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert({
      merchant_id: input.merchantId,
      amount: input.amount,
      currency: input.currency,
      method,
      phone: method === "mpesa_stk" ? input.phone : null,
      status: "processing",
      mode: input.mode,
      reference: input.reference ?? null,
      metadata,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && input.idempotencyKey) {
      const { data: existing } = await supabase
        .from("payments")
        .select("*")
        .eq("merchant_id", input.merchantId)
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      return { payment: existing as Payment, created: false };
    }
    throw error;
  }

  const payment = inserted as Payment;
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

  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({
      status: result.status,
      provider_ref: result.providerRef,
      failure_reason: result.failureReason ?? null,
      metadata: nextMetadata,
    })
    .eq("id", payment.id)
    .select("*")
    .single();

  if (updateError) throw updateError;

  const finalPayment = updated as Payment;

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
  const supabase = createServiceClient();
  const { data: paymentById, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", input.reference)
    .maybeSingle();

  if (error) throw error;
  let payment = paymentById;
  if (!payment) {
    const byRef = await supabase
      .from("payments")
      .select("*")
      .eq("provider_ref", input.reference)
      .maybeSingle();
    if (byRef.error) throw byRef.error;
    payment = byRef.data;
  }

  if (!payment) return null;

  const p = payment as Payment;
  if (p.status === "succeeded" || p.status === "refunded" || p.status === "partially_refunded") {
    if (input.status === "succeeded") return p;
  }

  const metadata = {
    ...p.metadata,
    ...(input.cardLast4 ? { card_last4: input.cardLast4 } : {}),
    ...(input.channel ? { paystack_channel: input.channel } : {}),
  };

  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({
      status: input.status,
      provider_ref: input.providerRef ?? p.provider_ref ?? input.reference,
      failure_reason: input.failureReason ?? null,
      metadata,
    })
    .eq("id", p.id)
    .select("*")
    .single();

  if (updateError) throw updateError;
  const finalPayment = updated as Payment;

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
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) throw error;
  return data as Payment | null;
}

export async function getPaymentById(paymentId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (error) throw error;
  return data as Payment | null;
}

export async function listPayments(
  merchantId: string,
  opts: { limit?: number; startingAfter?: string; mode?: ApiKeyMode } = {},
) {
  const supabase = createServiceClient();
  const limit = Math.min(opts.limit ?? 20, 100);

  let query = supabase
    .from("payments")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (opts.mode) {
    query = query.eq("mode", opts.mode);
  }

  if (opts.startingAfter) {
    const { data: cursor } = await supabase
      .from("payments")
      .select("created_at")
      .eq("id", opts.startingAfter)
      .eq("merchant_id", merchantId)
      .maybeSingle();
    if (cursor?.created_at) {
      query = query.lt("created_at", cursor.created_at);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Payment[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    data: items.map(serializePayment),
    has_more: hasMore,
  };
}
