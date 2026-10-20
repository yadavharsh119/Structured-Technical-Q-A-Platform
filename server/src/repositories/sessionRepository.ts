import { db } from '../config/database';
import { UserRole, UserStatus } from '../types/database';

export interface ActiveSessionRow {
  session_id: string;
  session_created_at: Date;
  user_id: string;
  role: UserRole;
  status: UserStatus;
  email_verified_at: Date | null;
  sessions_valid_after: Date | null;
}

export const sessionRepository = {
  async create(params: {
    userId: string;
    tokenHash: string;
    ip: string | undefined;
    userAgent: string | undefined;
    expiresAt: Date;
  }): Promise<void> {
    await db
      .insertInto('sessions')
      .values({
        user_id: params.userId,
        token_hash: params.tokenHash,
        ip_address: params.ip ?? null,
        user_agent: params.userAgent ?? null,
        expires_at: params.expiresAt,
      })
      .execute();
  },

  findActiveByTokenHash(tokenHash: string): Promise<ActiveSessionRow | undefined> {
    return db
      .selectFrom('sessions')
      .innerJoin('users', 'users.id', 'sessions.user_id')
      .select([
        'sessions.id as session_id',
        'sessions.created_at as session_created_at',
        'users.id as user_id',
        'users.role',
        'users.status',
        'users.email_verified_at',
        'users.sessions_valid_after',
      ])
      .where('sessions.token_hash', '=', tokenHash)
      .where('sessions.revoked_at', 'is', null)
      .where('sessions.expires_at', '>', new Date())
      .executeTakeFirst();
  },

  async touch(id: string, newExpiresAt: Date): Promise<void> {
    await db
      .updateTable('sessions')
      .set({ last_active_at: new Date(), expires_at: newExpiresAt })
      .where('id', '=', id)
      .execute();
  },

  async revoke(id: string): Promise<void> {
    await db
      .updateTable('sessions')
      .set({ revoked_at: new Date() })
      .where('id', '=', id)
      .execute();
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await db
      .updateTable('sessions')
      .set({ revoked_at: new Date() })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .execute();
  },
};
