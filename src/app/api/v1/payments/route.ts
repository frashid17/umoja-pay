import { z } from "zod";
import { authenticateApiKey, apiError, rateLimit } from "@/lib/api/auth";
import { createPayment, listPayments } from "@/lib/payments/service";
import { serializePayment } from "@/lib/payments/adapter";
import type { NextResponse } from "next/server";

const createSchema = z
  .object({
    amount: z.number().int().positive(),
    currency: z.enum(["KES", "TZS", "UGX", "RWF"]),
    method: z.enum(["mpesa_stk", "card"]).optional(),
    phone: z.string().min(9).max(20).optional(),
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
    if (method === "card" && !data.card_last4) {
      ctx.addIssue({
        code: "custom",
        message: "card_last4 is required for card (PCI: send last 4 only via API; use hosted checkout for full PAN)",
        path: ["card_last4"],
      });
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

  const sandboxHeader = request.headers.get("x-umoja-sandbox-outcome");
  const sandboxOutcome =
    sandboxHeader === "succeeded" || sandboxHeader === "failed" ? sandboxHeader : undefined;

  try {
    const { payment, created } = await createPayment({
      merchantId: auth.merchant.id,
      mode: auth.mode,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      method: parsed.data.method,
      phone: parsed.data.phone,
      cardLast4: parsed.data.card_last4,
      reference: parsed.data.reference,
      metadata: {
        ...(parsed.data.metadata ?? {}),
        ...(parsed.data.callback_url ? { callback_url: parsed.data.callback_url } : {}),
      },
      idempotencyKey: request.headers.get("idempotency-key"),
      sandboxOutcome,
      actorKeyId: auth.apiKey.id,
    });

    return Response.json(serializePayment(payment), { status: created ? 201 : 200 });
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
