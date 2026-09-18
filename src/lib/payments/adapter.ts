import type { Payment, PaymentStatus } from "@/lib/types";

export type InitiatePaymentInput = {
  paymentId: string;
  amount: number;
  currency: string;
  phone: string;
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

    if (!outcome) {
      const last = input.phone.replace(/\D/g, "").slice(-1);
      if (last === "0") outcome = "failed";
      else outcome = "succeeded";
    }

    // Simulate STK push latency
    await new Promise((resolve) => setTimeout(resolve, 400));

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
