"use server";

import { createPayment, getPaymentById } from "@/lib/payments/service";
import {
  expireOpenSessionIfNeeded,
  getCheckoutSession,
  markCheckoutCompleted,
} from "@/lib/checkout/sessions";
import { isPaystackConfigured, paystackVerifyTransaction } from "@/lib/paystack/client";
import { applyProviderPaymentStatus } from "@/lib/payments/service";
import type { PaymentMethod } from "@/lib/types";

export type CheckoutActionResult =
  | {
      ok: true;
      paymentId: string;
      status: string;
      displayText?: string;
      accessCode?: string;
      authorizationUrl?: string;
      publicKey?: string | null;
    }
  | { ok: false; error: string };

export async function completeCheckoutAction(formData: FormData): Promise<CheckoutActionResult> {
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

  const email = String(formData.get("email") ?? "").trim() || null;
  const usingPaystack = isPaystackConfigured(live.mode);

  try {
    if (method === "mpesa_stk") {
      const phone = String(formData.get("phone") ?? "").trim();
      if (phone.length < 9) return { ok: false, error: "Enter a valid phone number" };

      const { payment, displayText } = await createPayment({
        merchantId: live.merchant_id,
        mode: live.mode,
        amount: live.amount,
        currency: live.currency,
        method: "mpesa_stk",
        phone,
        email,
        reference: live.reference ?? undefined,
        metadata: {
          ...live.metadata,
          checkout_session_id: live.id,
          source: "hosted_checkout",
        },
        idempotencyKey: `checkout_${live.id}_mpesa_${phone.slice(-4)}`,
      });

      if (payment.status === "failed") {
        return { ok: false, error: payment.failure_reason ?? "Payment failed" };
      }

      if (payment.status === "succeeded") {
        await markCheckoutCompleted(live.id, payment.id);
      }

      return {
        ok: true,
        paymentId: payment.id,
        status: payment.status,
        displayText:
          displayText ||
          (usingPaystack
            ? "Check your phone and enter your M-Pesa PIN."
            : undefined),
      };
    }

    // Card via Paystack Popup / redirect — no PAN on our servers
    if (usingPaystack) {
      if (!email || !email.includes("@")) {
        return { ok: false, error: "Enter a valid email for card receipts" };
      }

      const { payment, accessCode, authorizationUrl, publicKey, displayText } = await createPayment({
        merchantId: live.merchant_id,
        mode: live.mode,
        amount: live.amount,
        currency: live.currency,
        method: "card",
        email,
        reference: live.reference ?? undefined,
        metadata: {
          ...live.metadata,
          checkout_session_id: live.id,
          source: "hosted_checkout",
        },
        idempotencyKey: `checkout_${live.id}_card_${email}`,
      });

      if (payment.status === "failed") {
        return { ok: false, error: payment.failure_reason ?? "Could not start card payment" };
      }

      return {
        ok: true,
        paymentId: payment.id,
        status: payment.status,
        accessCode,
        authorizationUrl,
        publicKey,
        displayText,
      };
    }

    // Sandbox fallback (no Paystack keys)
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
    return { ok: true, paymentId: payment.id, status: payment.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Payment failed" };
  }
}

export async function pollCheckoutPaymentAction(
  paymentId: string,
): Promise<{ status: string; failureReason?: string | null }> {
  const payment = await getPaymentById(paymentId);
  if (!payment) return { status: "failed", failureReason: "Payment not found" };

  if (payment.status === "processing" && isPaystackConfigured(payment.mode)) {
    try {
      const verified = await paystackVerifyTransaction(
        payment.mode,
        payment.provider_ref || payment.id,
      );
      const st = verified.data.status;
      if (st === "success") {
        await applyProviderPaymentStatus({
          reference: payment.id,
          status: "succeeded",
          providerRef: verified.data.reference,
          cardLast4: verified.data.authorization?.last4 ?? null,
          channel: verified.data.channel ?? null,
        });
        return { status: "succeeded" };
      }
      if (st === "failed" || st === "abandoned" || st === "reversed") {
        await applyProviderPaymentStatus({
          reference: payment.id,
          status: "failed",
          providerRef: verified.data.reference,
          failureReason: verified.data.gateway_response ?? "Payment failed",
        });
        return { status: "failed", failureReason: verified.data.gateway_response };
      }
    } catch {
      // keep processing
    }
  }

  const fresh = await getPaymentById(paymentId);
  return {
    status: fresh?.status ?? payment.status,
    failureReason: fresh?.failure_reason ?? payment.failure_reason,
  };
}
