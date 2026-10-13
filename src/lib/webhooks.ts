import { createHmac, randomBytes } from "crypto";
import { one, q } from "@/lib/db";
import type { ApiKeyMode, Payment, Refund, WebhookEndpoint } from "@/lib/types";

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function signPayload(secret: string, body: string, timestamp: number): string {
  const payload = `${timestamp}.${body}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function endpointFor(merchantId: string, mode: ApiKeyMode) {
  return one(
    await q<WebhookEndpoint>`
      select * from webhook_endpoints
      where merchant_id = ${merchantId}
        and mode = ${mode}::api_key_mode
        and enabled = true
    `,
  );
}

async function postSigned(url: string, secret: string, eventType: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(secret, body, timestamp);
  const send = async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Umoja-Signature": `t=${timestamp},v1=${signature}`,
        "X-Umoja-Event": eventType,
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

export async function dispatchPaymentWebhook(payment: Payment) {
  const endpoint = await endpointFor(payment.merchant_id, payment.mode);
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

  await postSigned(endpoint.url, endpoint.signing_secret, event.type, JSON.stringify(event));
}

export async function dispatchRefundWebhook(refund: Refund) {
  const endpoint = await endpointFor(refund.merchant_id, refund.mode);
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

  await postSigned(endpoint.url, endpoint.signing_secret, event.type, JSON.stringify(event));
}

export async function upsertWebhookEndpoint(input: {
  merchantId: string;
  url: string;
  mode: ApiKeyMode;
}) {
  const existing = one(
    await q<Pick<WebhookEndpoint, "id" | "signing_secret">>`
      select id, signing_secret from webhook_endpoints
      where merchant_id = ${input.merchantId} and mode = ${input.mode}::api_key_mode
    `,
  );

  if (existing) {
    const row = one(
      await q<WebhookEndpoint>`
        update webhook_endpoints
        set url = ${input.url}, enabled = true
        where id = ${existing.id}
        returning *
      `,
    );
    if (!row) throw new Error("Webhook endpoint not found");
    return row;
  }

  const row = one(
    await q<WebhookEndpoint>`
      insert into webhook_endpoints (merchant_id, url, mode, signing_secret, enabled)
      values (
        ${input.merchantId},
        ${input.url},
        ${input.mode}::api_key_mode,
        ${generateWebhookSecret()},
        true
      )
      returning *
    `,
  );
  if (!row) throw new Error("Could not create webhook endpoint");
  return row;
}
