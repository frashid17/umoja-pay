import { createServiceClient } from "@/lib/supabase/admin";

export async function writeAuditLog(input: {
  merchantId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  const supabase = createServiceClient();
  await supabase.from("audit_logs").insert({
    merchant_id: input.merchantId ?? null,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip: input.ip ?? null,
  });
}
