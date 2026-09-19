import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";

export type InitiatePaymentInput = {
  paymentId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  phone?: string | null;
  cardLast4?: string;
  sandboxOutcome?: "succeeded" | "failed";
};

export type InitiatePaymentResult = {
  providerRef: string;
  status: Extract<PaymentStatus, "processing" | "succeeded" | "failed">;
  failureReason?: string;
};

export interface PaymentProviderAdapter {
  name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
}

export class SandboxMpesaAdapter implements PaymentProviderAdapter {
  name = "sandbox_mpesa";

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const providerRef = `sandbox_stk_${input.paymentId.slice(0, 8)}`;
    let outcome = input.sandboxOutcome;
    const phone = input.phone ?? "";

    if (!outcome) {
      const last = phone.replace(/\D/g, "").slice(-1);
      if (last === "0") outcome = "failed";
      else outcome = "succeeded";
    }

    await new Promise((resolve) => setTimeout(resolve, 450));

    if (outcome === "failed") {
      return {
        providerRef,
        status: "failed",
        failureReason: "Sandbox: customer declined or insufficient funds",
      };
    }

    return {
      providerRef,
      status: "succeeded",
    };
  }
}

export class SandboxCardAdapter implements PaymentProviderAdapter {
  name = "sandbox_card";

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const providerRef = `sandbox_card_${input.paymentId.slice(0, 8)}`;
    let outcome = input.sandboxOutcome;
    const last4 = (input.cardLast4 ?? "").replace(/\D/g, "").slice(-4);

    if (!outcome) {
      // Stripe-like test: 4242 succeeds, 4000 fails
      if (last4 === "4000" || last4 === "0000") outcome = "failed";
      else outcome = "succeeded";
    }

    await new Promise((resolve) => setTimeout(resolve, 700));

    if (outcome === "failed") {
      return {
        providerRef,
        status: "failed",
        failureReason: "Sandbox: card was declined",
      };
    }

    return {
      providerRef,
      status: "succeeded",
    };
  }
}

export function getAdapterForMethod(method: PaymentMethod): PaymentProviderAdapter {
  if (method === "card") return new SandboxCardAdapter();
  return new SandboxMpesaAdapter();
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    phone: payment.phone,
    status: payment.status,
    reference: payment.reference,
    metadata: payment.metadata,
    mode: payment.mode,
    provider_ref: payment.provider_ref,
    failure_reason: payment.failure_reason,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
  };
}
