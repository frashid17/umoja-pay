import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { SandboxMpesaAdapter, serializePayment } from "@/lib/payments/adapter";
import { dispatchPaymentWebhook } from "@/lib/webhooks";
import type { ApiKeyMode, CurrencyCode, Payment, PaymentMethod } from "@/lib/types";

const adapter = new SandboxMpesaAdapter();

export type CreatePaymentInput = {
  merchantId: string;
  mode: ApiKeyMode;
  amount: number;
  currency: CurrencyCode;
  method?: PaymentMethod;
  phone: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  sandboxOutcome?: "succeeded" | "failed";
  actorKeyId?: string;
};

export async function createPayment(input: CreatePaymentInput) {
  const supabase = createServiceClient();

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

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert({
      merchant_id: input.merchantId,
      amount: input.amount,
      currency: input.currency,
      method: input.method ?? "mpesa_stk",
      phone: input.phone,
      status: "processing",
      mode: input.mode,
      reference: input.reference ?? null,
      metadata: input.metadata ?? {},
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

  const result = await adapter.initiate({
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    phone: payment.phone,
    sandboxOutcome: input.mode === "test" ? input.sandboxOutcome : undefined,
  });

  const { data: updated, error: updateError } = await supabase
    .from("payments")
    .update({
      status: result.status,
      provider_ref: result.providerRef,
      failure_reason: result.failureReason ?? null,
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
      api_key_id: input.actorKeyId,
    },
  });

  // Fire-and-forget webhook
  void dispatchPaymentWebhook(finalPayment);

  return { payment: finalPayment, created: true };
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
