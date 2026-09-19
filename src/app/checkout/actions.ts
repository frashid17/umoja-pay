"use server";

import { createPayment } from "@/lib/payments/service";
import {
  expireOpenSessionIfNeeded,
  getCheckoutSession,
  markCheckoutCompleted,
} from "@/lib/checkout/sessions";
import type { PaymentMethod } from "@/lib/types";

export async function completeCheckoutAction(
  formData: FormData,
): Promise<{ ok: true; paymentId: string } | { ok: false; error: string }> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const method = String(formData.get("method") ?? "mpesa_stk") as PaymentMethod;

  if (!sessionId) return { ok: false, error: "Missing checkout session" };
  if (method !== "mpesa_stk" && method !== "card") {
    return { ok: false, error: "Unsupported payment method" };
  }

  const session = await getCheckoutSession(sessionId);
  if (!session) return { ok: false, error: "Checkout not found" };

  const live = await expireOpenSessionIfNeeded(session);
  if (live.status === "expired") return { ok: false, error: "This checkout link has expired" };
  if (live.status === "completed") return { ok: false, error: "This checkout was already paid" };
  if (live.status !== "open") return { ok: false, error: "Checkout is no longer available" };
  if (live.is_preview) return { ok: false, error: "Preview sessions cannot be charged" };

  try {
    if (method === "mpesa_stk") {
      const phone = String(formData.get("phone") ?? "").trim();
      if (phone.length < 9) return { ok: false, error: "Enter a valid phone number" };

      const { payment } = await createPayment({
        merchantId: live.merchant_id,
        mode: live.mode,
        amount: live.amount,
        currency: live.currency,
        method: "mpesa_stk",
        phone,
        reference: live.reference ?? undefined,
        metadata: {
          ...live.metadata,
          checkout_session_id: live.id,
          source: "hosted_checkout",
        },
        idempotencyKey: `checkout_${live.id}_mpesa`,
      });

      if (payment.status === "failed") {
        return { ok: false, error: payment.failure_reason ?? "Payment failed" };
      }

      await markCheckoutCompleted(live.id, payment.id);
      return { ok: true, paymentId: payment.id };
    }

    const cardNumber = String(formData.get("cardNumber") ?? "").replace(/\D/g, "");
    const cardName = String(formData.get("cardName") ?? "").trim();
    const expiry = String(formData.get("expiry") ?? "").trim();
    const cvc = String(formData.get("cvc") ?? "").trim();

    if (!cardName || cardNumber.length < 12 || !expiry || cvc.length < 3) {
      return { ok: false, error: "Enter complete card details" };
    }

    const last4 = cardNumber.slice(-4);
    const { payment } = await createPayment({
      merchantId: live.merchant_id,
      mode: live.mode,
      amount: live.amount,
      currency: live.currency,
      method: "card",
      cardLast4: last4,
      reference: live.reference ?? undefined,
      metadata: {
        ...live.metadata,
        checkout_session_id: live.id,
        source: "hosted_checkout",
        card_brand: "sandbox",
      },
      idempotencyKey: `checkout_${live.id}_card`,
    });

    if (payment.status === "failed") {
      return { ok: false, error: payment.failure_reason ?? "Card was declined" };
    }

    await markCheckoutCompleted(live.id, payment.id);
    return { ok: true, paymentId: payment.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Payment failed" };
  }
}
