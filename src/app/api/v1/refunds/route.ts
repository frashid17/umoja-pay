import { z } from "zod";
import { authenticateApiKey, apiError, rateLimit } from "@/lib/api/auth";
import { createRefund, listRefunds, serializeRefund } from "@/lib/payments/refunds";

const createSchema = z.object({
  payment_id: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  if (!rateLimit(`refund:${auth.apiKey.id}`)) {
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
    const refund = await createRefund({
      merchantId: auth.merchant.id,
      paymentId: parsed.data.payment_id,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      sandboxOutcome,
    });
    return Response.json(serializeRefund(refund), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    const status =
      message.includes("not found") || message.includes("Only succeeded") || message.includes("exceeds")
        ? 400
        : 500;
    return apiError(status, "refund_failed", message);
  }
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20") || 20, 100);

  try {
    const rows = await listRefunds(auth.merchant.id, limit);
    return Response.json({
      data: rows.filter((r) => r.mode === auth.mode).map(serializeRefund),
      has_more: false,
    });
  } catch (e) {
    return apiError(500, "list_failed", e instanceof Error ? e.message : "Failed");
  }
}
