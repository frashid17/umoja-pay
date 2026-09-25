import { applyProviderPaymentStatus } from "@/lib/payments/service";
import { createServiceClient } from "@/lib/supabase/admin";
import { verifyPaystackSignatureAny, paystackVerifyTransaction } from "@/lib/paystack/client";
import type { ApiKeyMode, Refund } from "@/lib/types";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const mode = verifyPaystackSignatureAny(rawBody, signature);

  if (!mode) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody) as { event?: string; data?: Record<string, unknown> };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = event.event ?? "";
  const data = event.data ?? {};

  try {
    if (type === "charge.success") {
      const reference = String(data.reference ?? "");
      if (reference) {
        const auth = data.authorization as { last4?: string; brand?: string } | undefined;
        await applyProviderPaymentStatus({
          reference,
          status: "succeeded",
          providerRef: reference,
          cardLast4: auth?.last4 ?? null,
          channel: typeof data.channel === "string" ? data.channel : null,
        });
      }
    }

    if (type === "charge.failed") {
      const reference = String(data.reference ?? "");
      if (reference) {
        await applyProviderPaymentStatus({
          reference,
          status: "failed",
          providerRef: reference,
          failureReason:
            typeof data.gateway_response === "string"
              ? data.gateway_response
              : "Charge failed",
        });
      }
    }

    if (type.startsWith("refund.")) {
      await handleRefundEvent(type, data, mode);
    }
  } catch (e) {
    console.error("[paystack webhook]", e);
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}

async function handleRefundEvent(
  type: string,
  data: Record<string, unknown>,
  mode: ApiKeyMode,
) {
  const supabase = createServiceClient();
  const refundId = data.id != null ? String(data.id) : null;
  const txRef =
    typeof data.transaction_reference === "string"
      ? data.transaction_reference
      : typeof (data.transaction as { reference?: string } | undefined)?.reference === "string"
        ? (data.transaction as { reference: string }).reference
        : null;

  let refund: Refund | null = null;
  if (refundId) {
    const { data: byProvider } = await supabase
      .from("refunds")
      .select("*")
      .eq("provider_ref", refundId)
      .maybeSingle();
    refund = byProvider as Refund | null;
  }

  if (!refund && txRef) {
    const { data: payment } = await supabase
      .from("payments")
      .select("id")
      .or(`id.eq.${txRef},provider_ref.eq.${txRef}`)
      .maybeSingle();
    if (payment) {
      const { data: rows } = await supabase
        .from("refunds")
        .select("*")
        .eq("payment_id", payment.id)
        .order("created_at", { ascending: false })
        .limit(1);
      refund = (rows?.[0] as Refund | undefined) ?? null;
    }
  }

  if (!refund) return;

  const status =
    type === "refund.processed"
      ? "succeeded"
      : type === "refund.failed"
        ? "failed"
        : type === "refund.pending" || type === "refund.processing"
          ? "processing"
          : refund.status;

  await supabase
    .from("refunds")
    .update({
      status,
      ...(refundId ? { provider_ref: refundId } : {}),
      failure_reason: type === "refund.failed" ? "Paystack refund failed" : null,
    })
    .eq("id", refund.id);

  // Re-verify transaction when useful (no-op if keys missing)
  if (txRef && type === "refund.processed") {
    await paystackVerifyTransaction(mode, txRef).catch(() => null);
  }
}
