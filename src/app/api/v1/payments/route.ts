import { z } from "zod";
import { authenticateApiKey, apiError, rateLimit } from "@/lib/api/auth";
import { createPayment, listPayments } from "@/lib/payments/service";
import { serializePayment } from "@/lib/payments/adapter";
import { isPaystackConfigured } from "@/lib/paystack/client";
import type { NextResponse } from "next/server";

const createSchema = z
  .object({
    amount: z.number().int().positive(),
    currency: z.enum(["KES", "TZS", "UGX", "RWF"]),
    method: z.enum(["mpesa_stk", "card"]).optional(),
    phone: z.string().min(9).max(20).optional(),
    email: z.string().email().optional(),
    card_last4: z.string().min(4).max(4).optional(),
    reference: z.string().max(120).optional(),
    metadata: z.record(z.unknown()).optional(),
    callback_url: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    const method = data.method ?? "mpesa_stk";
    if (method === "mpesa_stk" && !data.phone) {
      ctx.addIssue({ code: "custom", message: "phone is required for mpesa_stk", path: ["phone"] });
    }
  });

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  if (!rateLimit(`pay:${auth.apiKey.id}`)) {
    return apiError(429, "rate_limited", "Too many requests");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON");
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const method = parsed.data.method ?? "mpesa_stk";
  const usingPaystack = isPaystackConfigured(auth.mode);

  if (method === "card" && usingPaystack && !parsed.data.email) {
    return apiError(400, "invalid_request", "email is required for Paystack card payments");
  }
  if (method === "card" && !usingPaystack && !parsed.data.card_last4) {
    return apiError(
      400,
      "invalid_request",
      "card_last4 is required for sandbox card (or configure Paystack)",
    );
  }

  const sandboxHeader = request.headers.get("x-umoja-sandbox-outcome");
  const sandboxOutcome =
    sandboxHeader === "succeeded" || sandboxHeader === "failed" ? sandboxHeader : undefined;

  try {
    const { payment, created, accessCode, authorizationUrl, displayText, publicKey } =
      await createPayment({
        merchantId: auth.merchant.id,
        mode: auth.mode,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        method: parsed.data.method,
        phone: parsed.data.phone,
        email: parsed.data.email,
        cardLast4: parsed.data.card_last4,
        reference: parsed.data.reference,
        callbackUrl: parsed.data.callback_url,
        metadata: {
          ...(parsed.data.metadata ?? {}),
          ...(parsed.data.callback_url ? { callback_url: parsed.data.callback_url } : {}),
        },
        idempotencyKey: request.headers.get("idempotency-key"),
        sandboxOutcome,
        actorKeyId: auth.apiKey.id,
      });

    return Response.json(
      {
        ...serializePayment(payment),
        ...(displayText ? { display_text: displayText } : {}),
        ...(accessCode ? { access_code: accessCode } : {}),
        ...(authorizationUrl ? { authorization_url: authorizationUrl } : {}),
        ...(publicKey ? { public_key: publicKey } : {}),
      },
      { status: created ? 201 : 200 },
    );
  } catch (e) {
    return apiError(500, "payment_failed", e instanceof Error ? e.message : "Failed");
  }
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth as NextResponse;

  if (!rateLimit(`list:${auth.apiKey.id}`, 120)) {
    return apiError(429, "rate_limited", "Too many requests");
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const startingAfter = url.searchParams.get("starting_after") ?? undefined;

  try {
    const result = await listPayments(auth.merchant.id, {
      limit: Number.isFinite(limit) ? limit : 20,
      startingAfter,
      mode: auth.mode,
    });
    return Response.json(result);
  } catch (e) {
    return apiError(500, "list_failed", e instanceof Error ? e.message : "Failed");
  }
}
