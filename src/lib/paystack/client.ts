import { createHmac } from "crypto";
import type { ApiKeyMode } from "@/lib/types";

const PAYSTACK_BASE = "https://api.paystack.co";

export function isPaystackConfigured(mode: ApiKeyMode = "test") {
  if (process.env.PAYMENTS_PROVIDER === "sandbox") return false;
  return Boolean(getPaystackSecretKey(mode));
}

export function getPaystackSecretKey(mode: ApiKeyMode) {
  if (mode === "live") {
    return process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || null;
  }
  return process.env.PAYSTACK_SECRET_KEY || null;
}

export function getPaystackPublicKey(mode: ApiKeyMode) {
  if (mode === "live") {
    return (
      process.env.NEXT_PUBLIC_PAYSTACK_LIVE_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
      null
    );
  }
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || null;
}

/** Normalize KE MSISDNs to +2547… for Paystack M-Pesa. */
export function formatPaystackPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 10) return `+254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `+254${digits}`;
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

async function paystackFetch<T>(
  mode: ApiKeyMode,
  path: string,
  init?: RequestInit,
): Promise<PaystackResponse<T>> {
  const secret = getPaystackSecretKey(mode);
  if (!secret) throw new Error("Paystack is not configured");

  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack error (${res.status})`);
  }
  return json;
}

export type PaystackChargeData = {
  reference: string;
  status: string;
  display_text?: string;
  amount?: number;
  currency?: string;
};

export async function paystackChargeMpesa(input: {
  mode: ApiKeyMode;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  phone: string;
}) {
  return paystackFetch<PaystackChargeData>(input.mode, "/charge", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      mobile_money: {
        phone: formatPaystackPhone(input.phone),
        provider: "mpesa",
      },
    }),
  });
}

export type PaystackInitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function paystackInitializeCard(input: {
  mode: ApiKeyMode;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return paystackFetch<PaystackInitializeData>(input.mode, "/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["card"],
      metadata: input.metadata ?? {},
    }),
  });
}

export type PaystackVerifyData = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  gateway_response?: string;
  channel?: string;
  paid_at?: string | null;
  authorization?: { last4?: string; brand?: string; channel?: string };
  customer?: { email?: string };
};

export async function paystackVerifyTransaction(mode: ApiKeyMode, reference: string) {
  return paystackFetch<PaystackVerifyData>(
    mode,
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
}

export async function paystackCreateRefund(input: {
  mode: ApiKeyMode;
  transaction: string;
  amount?: number;
  currency?: string;
  merchantNote?: string;
}) {
  return paystackFetch<{ id: number; status: string; transaction?: { reference?: string } }>(
    input.mode,
    "/refund",
    {
      method: "POST",
      body: JSON.stringify({
        transaction: input.transaction,
        ...(input.amount != null ? { amount: input.amount } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.merchantNote ? { merchant_note: input.merchantNote } : {}),
      }),
    },
  );
}

export function verifyPaystackSignature(rawBody: string, signature: string | null, mode: ApiKeyMode) {
  if (!signature) return false;
  const secret = getPaystackSecretKey(mode);
  if (!secret) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

/** Try both test and live secrets when verifying webhooks. */
export function verifyPaystackSignatureAny(rawBody: string, signature: string | null) {
  if (verifyPaystackSignature(rawBody, signature, "test")) return "test" as const;
  if (verifyPaystackSignature(rawBody, signature, "live")) return "live" as const;
  return null;
}
