"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";
import { createPayment } from "@/lib/payments/service";
import { serializePayment } from "@/lib/payments/adapter";
import { writeAuditLog } from "@/lib/audit";
import type { CurrencyCode } from "@/lib/types";

export type SandboxPaymentResult =
  | { ok: true; payment: ReturnType<typeof serializePayment> }
  | { ok: false; error: string };

export async function runSandboxPaymentAction(input: {
  amount: number;
  currency: CurrencyCode;
  phone: string;
  reference?: string;
  outcome: "auto" | "succeeded" | "failed";
}): Promise<SandboxPaymentResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to use the sandbox." };

  const ctx = await getUserMerchant(user.id);
  if (!ctx) return { ok: false, error: "Complete onboarding first." };

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Amount must be a positive integer (minor units)." };
  }

  const phone = input.phone.replace(/\s+/g, "");
  if (phone.length < 9 || phone.length > 20) {
    return { ok: false, error: "Enter a valid MSISDN (e.g. 254712345678)." };
  }

  const currencies: CurrencyCode[] = ["KES", "TZS", "UGX", "RWF"];
  if (!currencies.includes(input.currency)) {
    return { ok: false, error: "Unsupported currency." };
  }

  try {
    const { payment } = await createPayment({
      merchantId: ctx.merchant.id,
      mode: "test",
      amount: input.amount,
      currency: input.currency,
      method: "mpesa_stk",
      phone,
      reference: input.reference?.trim() || `sandbox_${Date.now()}`,
      metadata: { source: "dashboard_sandbox" },
      idempotencyKey: `sandbox_ui_${crypto.randomUUID()}`,
      sandboxOutcome: input.outcome === "auto" ? undefined : input.outcome,
    });

    await writeAuditLog({
      merchantId: ctx.merchant.id,
      actorUserId: user.id,
      action: "sandbox.payment_simulated",
      entityType: "payment",
      entityId: payment.id,
      metadata: { outcome: input.outcome, amount: input.amount, currency: input.currency },
    });

    revalidatePath("/dashboard/sandbox");
    revalidatePath("/dashboard/payments");
    return { ok: true, payment: serializePayment(payment) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sandbox payment failed" };
  }
}
