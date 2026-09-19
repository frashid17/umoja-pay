import { createServiceClient } from "@/lib/supabase/admin";
import type {
  ApiKeyMode,
  CheckoutSession,
  CurrencyCode,
  Merchant,
} from "@/lib/types";

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
  const supabase = createServiceClient();
  const expiresIn = input.expiresInMinutes ?? 30;
  const expiresAt = new Date(Date.now() + expiresIn * 60_000).toISOString();

  const { data, error } = await supabase
    .from("checkout_sessions")
    .insert({
      merchant_id: input.merchantId,
      amount: input.amount,
      currency: input.currency,
      description: input.description ?? null,
      reference: input.reference ?? null,
      mode: input.mode ?? "test",
      is_preview: input.isPreview ?? false,
      success_url: input.successUrl ?? null,
      cancel_url: input.cancelUrl ?? null,
      metadata: input.metadata ?? {},
      expires_at: expiresAt,
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CheckoutSession;
}

export async function getCheckoutSession(sessionId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as CheckoutSession | null;
}

export async function getMerchantForCheckout(merchantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("merchants")
    .select("id, name, logo_path, brand_accent, support_email, website, country, status")
    .eq("id", merchantId)
    .maybeSingle();

  if (error) throw error;
  return data as Pick<
    Merchant,
    | "id"
    | "name"
    | "logo_path"
    | "brand_accent"
    | "support_email"
    | "website"
    | "country"
    | "status"
  > | null;
}

export function merchantLogoPublicUrl(logoPath: string | null | undefined) {
  if (!logoPath) return null;
  const supabase = createServiceClient();
  const { data } = supabase.storage.from("merchant-logos").getPublicUrl(logoPath);
  return data.publicUrl;
}

export async function markCheckoutCompleted(sessionId: string, paymentId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .update({
      status: "completed",
      payment_id: paymentId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "open")
    .select("*")
    .single();

  if (error) throw error;
  return data as CheckoutSession;
}

export async function expireOpenSessionIfNeeded(session: CheckoutSession) {
  if (session.status !== "open") return session;
  if (new Date(session.expires_at).getTime() > Date.now()) return session;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("checkout_sessions")
    .update({ status: "expired" })
    .eq("id", session.id)
    .eq("status", "open")
    .select("*")
    .maybeSingle();

  return (data as CheckoutSession | null) ?? { ...session, status: "expired" as const };
}
