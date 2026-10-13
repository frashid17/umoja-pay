import { q } from "@/lib/db";

export async function writeAuditLog(input: {
  merchantId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  await q`
    insert into audit_logs (
      merchant_id, actor_user_id, action, entity_type, entity_id, metadata, ip
    )
    values (
      ${input.merchantId ?? null},
      ${input.actorUserId ?? null},
      ${input.action},
      ${input.entityType},
      ${input.entityId ?? null},
      ${JSON.stringify(input.metadata ?? {})}::jsonb,
      ${input.ip ?? null}
    )
  `;
}
