import { one, q } from "@/lib/db";
import { applyProviderPaymentStatus } from "@/lib/payments/service";
import { verifyPaystackSignatureAny, paystackVerifyTransaction } from "@/lib/paystack/client";
import type { ApiKeyMode, Payment, Refund } from "@/lib/types";

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
  const refundId = data.id != null ? String(data.id) : null;
  const txRef =
    typeof data.transaction_reference === "string"
      ? data.transaction_reference
      : typeof (data.transaction as { reference?: string } | undefined)?.reference === "string"
        ? (data.transaction as { reference: string }).reference
        : null;

  let refund: Refund | null = null;
  if (refundId) {
    refund = one(await q<Refund>`select * from refunds where provider_ref = ${refundId}`);
  }

  if (!refund && txRef) {
    const payment = one(
      await q<Pick<Payment, "id">>`
        select id from payments
        where id::text = ${txRef} or provider_ref = ${txRef}
      `,
    );
    if (payment) {
      refund = one(
        await q<Refund>`
          select * from refunds
          where payment_id = ${payment.id}
          order by created_at desc
          limit 1
        `,
      );
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

  await q`
    update refunds
    set status = ${status}::refund_status,
        provider_ref = coalesce(${refundId}, provider_ref),
        failure_reason = ${type === "refund.failed" ? "Paystack refund failed" : null}
    where id = ${refund.id}
  `;

  // Re-verify transaction when useful (no-op if keys missing)
  if (txRef && type === "refund.processed") {
    await paystackVerifyTransaction(mode, txRef).catch(() => null);
  }
}
