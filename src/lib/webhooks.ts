import { createHmac, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import type { ApiKeyMode, Payment, Refund } from "@/lib/types";

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function signPayload(secret: string, body: string, timestamp: number): string {
  const payload = `${timestamp}.${body}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchPaymentWebhook(payment: Payment) {
  const supabase = createServiceClient();
  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("merchant_id", payment.merchant_id)
    .eq("mode", payment.mode)
    .eq("enabled", true)
    .maybeSingle();

  if (!endpoint?.url) return;

  const event = {
    id: `evt_${payment.id}`,
    type: `payment.${payment.status}`,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        phone: payment.phone,
        status: payment.status,
        reference: payment.reference,
        metadata: payment.metadata,
        mode: payment.mode,
        failure_reason: payment.failure_reason,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      },
    },
  };

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(endpoint.signing_secret, body, timestamp);

  const send = async () => {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Umoja-Signature": `t=${timestamp},v1=${signature}`,
        "X-Umoja-Event": event.type,
      },
      body,
    });
    return res.ok;
  };

  try {
    const ok = await send();
    if (!ok) await send();
  } catch {
    try {
      await send();
    } catch {
      // MVP: single retry; durable queue later
    }
  }
}

export async function dispatchRefundWebhook(refund: Refund) {
  const supabase = createServiceClient();
  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("merchant_id", refund.merchant_id)
    .eq("mode", refund.mode)
    .eq("enabled", true)
    .maybeSingle();

  if (!endpoint?.url) return;

  const event = {
    id: `evt_${refund.id}`,
    type: `refund.${refund.status}`,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        method: refund.method,
        status: refund.status,
        reason: refund.reason,
        mode: refund.mode,
        failure_reason: refund.failure_reason,
        metadata: refund.metadata,
        created_at: refund.created_at,
        updated_at: refund.updated_at,
      },
    },
  };

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(endpoint.signing_secret, body, timestamp);

  const send = async () => {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Umoja-Signature": `t=${timestamp},v1=${signature}`,
        "X-Umoja-Event": event.type,
      },
      body,
    });
    return res.ok;
  };

  try {
    const ok = await send();
    if (!ok) await send();
  } catch {
    try {
      await send();
    } catch {
      // MVP: single retry; durable queue later
    }
  }
}

export async function upsertWebhookEndpoint(input: {
  merchantId: string;
  url: string;
  mode: ApiKeyMode;
}) {
  const supabase = createServiceClient();
  const signingSecret = generateWebhookSecret();

  const { data: existing } = await supabase
    .from("webhook_endpoints")
    .select("id, signing_secret")
    .eq("merchant_id", input.merchantId)
    .eq("mode", input.mode)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .update({ url: input.url, enabled: true })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      merchant_id: input.merchantId,
      url: input.url,
      mode: input.mode,
      signing_secret: signingSecret,
      enabled: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
