import { authenticateApiKey, apiError, rateLimit } from "@/lib/api/auth";
import { getPayment } from "@/lib/payments/service";
import { serializePayment } from "@/lib/payments/adapter";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  if (!rateLimit(`get:${auth.apiKey.id}`, 120)) {
    return apiError(429, "rate_limited", "Too many requests");
  }

  const { id } = await context.params;

  try {
    const payment = await getPayment(auth.merchant.id, id);
    if (!payment) return apiError(404, "not_found", "Payment not found");
    return Response.json(serializePayment(payment));
  } catch (e) {
    return apiError(500, "get_failed", e instanceof Error ? e.message : "Failed");
  }
}
