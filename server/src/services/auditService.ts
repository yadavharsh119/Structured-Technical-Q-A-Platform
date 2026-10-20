import { db } from '../config/database';

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

export const auditService = {
  // SEC-06: never put passwords, raw tokens or hashes in metadata.
  async log(entry: AuditEntry): Promise<void> {
    await db
      .insertInto('audit_logs')
      .values({
        actor_user_id: entry.actorUserId ?? null,
        action: entry.action,
        target_type: entry.targetType ?? null,
        target_id: entry.targetId ?? null,
        ip_address: entry.ip ?? null,
        result: entry.result,
        metadata: entry.metadata ?? {},
      })
      .execute();
  },
};
