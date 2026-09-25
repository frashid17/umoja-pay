import type { ApiKeyMode, PaymentStatus } from "@/lib/types";
import {
  getPaystackPublicKey,
  paystackChargeMpesa,
  paystackCreateRefund,
  paystackInitializeCard,
} from "@/lib/paystack/client";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProviderAdapter,
  RefundPaymentInput,
  RefundPaymentResult,
} from "@/lib/payments/adapter";

export type PaystackInitiateExtras = {
  mode: ApiKeyMode;
  email?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
};

export class PaystackAdapter implements PaymentProviderAdapter {
  name = "paystack";

  constructor(private mode: ApiKeyMode) {}

  async initiate(
    input: InitiatePaymentInput & Partial<PaystackInitiateExtras>,
  ): Promise<
    InitiatePaymentResult & {
      accessCode?: string;
      authorizationUrl?: string;
      displayText?: string;
      publicKey?: string | null;
    }
  > {
    const email =
      input.email ||
      (typeof input.metadata?.email === "string" ? input.metadata.email : null) ||
      `payer+${input.paymentId.replace(/-/g, "").slice(0, 12)}@umoja.pay`;

    if (input.method === "mpesa_stk") {
      if (!input.phone?.trim()) {
        return {
          providerRef: input.paymentId,
          status: "failed",
          failureReason: "Phone is required for M-Pesa",
        };
      }

      try {
        const res = await paystackChargeMpesa({
          mode: this.mode,
          email,
          amount: input.amount,
          currency: input.currency,
          reference: input.paymentId,
          phone: input.phone,
        });

        const status = mapPaystackChargeStatus(res.data.status);
        return {
          providerRef: res.data.reference || input.paymentId,
          status,
          displayText:
            res.data.display_text ||
            "Check your phone and enter your M-Pesa PIN to authorize payment.",
          failureReason: status === "failed" ? res.message : undefined,
        };
      } catch (e) {
        return {
          providerRef: input.paymentId,
          status: "failed",
          failureReason: e instanceof Error ? e.message : "Paystack M-Pesa charge failed",
        };
      }
    }

    try {
      const callbackUrl =
        input.callbackUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/paystack/callback`;

      const res = await paystackInitializeCard({
        mode: this.mode,
        email,
        amount: input.amount,
        currency: input.currency,
        reference: input.paymentId,
        callbackUrl: `${callbackUrl}?reference=${encodeURIComponent(input.paymentId)}`,
        metadata: {
          payment_id: input.paymentId,
          ...(input.metadata ?? {}),
        },
      });

      return {
        providerRef: res.data.reference || input.paymentId,
        status: "processing",
        accessCode: res.data.access_code,
        authorizationUrl: res.data.authorization_url,
        publicKey: getPaystackPublicKey(this.mode),
        displayText: "Complete card payment securely with Paystack.",
      };
    } catch (e) {
      return {
        providerRef: input.paymentId,
        status: "failed",
        failureReason: e instanceof Error ? e.message : "Paystack card init failed",
      };
    }
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    if (!input.originalProviderRef) {
      return {
        providerRef: `paystack_refund_${input.refundId.slice(0, 8)}`,
        status: "failed",
        failureReason: "Missing original Paystack transaction reference",
      };
    }

    try {
      const res = await paystackCreateRefund({
        mode: this.mode,
        transaction: input.originalProviderRef,
        amount: input.amount,
        currency: input.currency,
      });

      const st = String(res.data.status || "").toLowerCase();
      const ok =
        st === "processed" ||
        st === "processing" ||
        st === "pending" ||
        st === "success" ||
        res.status === true;

      return {
        providerRef: String(res.data.id ?? `paystack_refund_${input.refundId.slice(0, 8)}`),
        status: ok ? "succeeded" : "failed",
        failureReason: ok ? undefined : res.message,
      };
    } catch (e) {
      return {
        providerRef: `paystack_refund_${input.refundId.slice(0, 8)}`,
        status: "failed",
        failureReason: e instanceof Error ? e.message : "Paystack refund failed",
      };
    }
  }
}

function mapPaystackChargeStatus(
  status: string | undefined,
): Extract<PaymentStatus, "processing" | "succeeded" | "failed"> {
  const s = (status || "").toLowerCase();
  if (s === "success" || s === "successful") return "succeeded";
  if (s === "failed" || s === "reversed" || s === "abandoned") return "failed";
  return "processing";
}
