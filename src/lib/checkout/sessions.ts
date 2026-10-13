import { dbMessage, one, q } from "@/lib/db";
import { publicObjectUrl } from "@/lib/storage";
import type { ApiKeyMode, CheckoutSession, CurrencyCode, Merchant } from "@/lib/types";

export type CreateCheckoutSessionInput = {
  merchantId: string;
  amount: number;
  currency: CurrencyCode;
  description?: string;
  reference?: string;
  mode?: ApiKeyMode;
  isPreview?: boolean;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
  expiresInMinutes?: number;
};

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  const expiresIn = input.expiresInMinutes ?? 30;
  const expiresAt = new Date(Date.now() + expiresIn * 60_000).toISOString();

  try {
    const row = one(
      await q<CheckoutSession>`
        insert into checkout_sessions (
          merchant_id, amount, currency, description, reference, mode, is_preview,
          success_url, cancel_url, metadata, expires_at, status
        )
        values (
          ${input.merchantId},
          ${input.amount},
          ${input.currency}::currency_code,
          ${input.description ?? null},
          ${input.reference ?? null},
          ${input.mode ?? "test"}::api_key_mode,
          ${input.isPreview ?? false},
          ${input.successUrl ?? null},
          ${input.cancelUrl ?? null},
          ${JSON.stringify(input.metadata ?? {})}::jsonb,
          ${expiresAt}::timestamptz,
          'open'
        )
        returning *
      `,
    );
    if (!row) throw new Error("Could not create checkout session");
    return row;
  } catch (error) {
    throw error instanceof Error ? error : new Error(dbMessage(error));
  }
}

export async function getCheckoutSession(sessionId: string) {
  return one(
    await q<CheckoutSession>`select * from checkout_sessions where id = ${sessionId}`,
  );
}

export async function getMerchantForCheckout(merchantId: string) {
  return one(
    await q<
      Pick<
        Merchant,
        | "id"
        | "name"
        | "logo_path"
        | "brand_accent"
        | "support_email"
        | "website"
        | "country"
        | "status"
      >
    >`
      select id, name, logo_path, brand_accent, support_email, website, country, status
      from merchants
      where id = ${merchantId}
    `,
  );
}

export function merchantLogoPublicUrl(logoPath: string | null | undefined) {
  return publicObjectUrl("merchant-logos", logoPath);
}

export async function markCheckoutCompleted(sessionId: string, paymentId: string) {
  const row = one(
    await q<CheckoutSession>`
      update checkout_sessions
      set status = 'completed',
          payment_id = ${paymentId},
          completed_at = now()
      where id = ${sessionId} and status = 'open'
      returning *
    `,
  );
  if (!row) throw new Error("Checkout session is no longer open");

  const invoiceId =
    typeof row.metadata?.invoice_id === "string" ? row.metadata.invoice_id : null;
  if (invoiceId) {
    const { markInvoicePaid } = await import("@/lib/invoices");
    await markInvoicePaid({
      invoiceId,
      merchantId: row.merchant_id,
      paymentId,
    }).catch(() => null);
  }

  return row;
}

export async function expireOpenSessionIfNeeded(session: CheckoutSession) {
  if (session.status !== "open") return session;
  if (new Date(session.expires_at).getTime() > Date.now()) return session;

  const row = one(
    await q<CheckoutSession>`
      update checkout_sessions
      set status = 'expired'
      where id = ${session.id} and status = 'open'
      returning *
    `,
  );
  return row ?? { ...session, status: "expired" as const };
}
