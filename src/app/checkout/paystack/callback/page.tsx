import { redirect } from "next/navigation";
import { applyProviderPaymentStatus, getPaymentById } from "@/lib/payments/service";
import { isPaystackConfigured, paystackVerifyTransaction } from "@/lib/paystack/client";
import { markCheckoutCompleted } from "@/lib/checkout/sessions";

export default async function PaystackCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const sp = await searchParams;
  const reference = sp.reference || sp.trxref;
  if (!reference) {
    redirect("/");
  }

  const payment = await getPaymentById(reference);
  if (!payment) {
    redirect("/");
  }

  if (isPaystackConfigured(payment.mode) && payment.status === "processing") {
    try {
      const verified = await paystackVerifyTransaction(
        payment.mode,
        payment.provider_ref || payment.id,
      );
      if (verified.data.status === "success") {
        await applyProviderPaymentStatus({
          reference: payment.id,
          status: "succeeded",
          providerRef: verified.data.reference,
          cardLast4: verified.data.authorization?.last4 ?? null,
          channel: verified.data.channel ?? null,
        });
      } else if (
        verified.data.status === "failed" ||
        verified.data.status === "abandoned" ||
        verified.data.status === "reversed"
      ) {
        await applyProviderPaymentStatus({
          reference: payment.id,
          status: "failed",
          providerRef: verified.data.reference,
          failureReason: verified.data.gateway_response ?? "Payment failed",
        });
      }
    } catch {
      // fall through
    }
  }

  const fresh = await getPaymentById(reference);
  const checkoutId =
    typeof fresh?.metadata?.checkout_session_id === "string"
      ? fresh.metadata.checkout_session_id
      : null;

  if (fresh?.status === "succeeded" && checkoutId) {
    await markCheckoutCompleted(checkoutId, fresh.id).catch(() => null);
    redirect(`/checkout/${checkoutId}`);
  }

  if (checkoutId) {
    redirect(`/checkout/${checkoutId}?pay=${fresh?.status ?? "processing"}`);
  }

  redirect("/");
}
