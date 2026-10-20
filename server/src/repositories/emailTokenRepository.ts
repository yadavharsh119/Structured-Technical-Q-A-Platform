import { db } from '../config/database';

export const emailTokenRepository = {
  async create(params: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await db
      .insertInto('email_verification_tokens')
      .values({
        user_id: params.userId,
        token_hash: params.tokenHash,
        expires_at: params.expiresAt,
      })
      .execute();
  },

  findValid(tokenHash: string) {
    return db
      .selectFrom('email_verification_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .where('used_at', 'is', null)
      .where('expires_at', '>', new Date())
      .executeTakeFirst();
  },

  async markUsed(id: string): Promise<void> {
    await db
      .updateTable('email_verification_tokens')
      .set({ used_at: new Date() })
      .where('id', '=', id)
      .execute();
  },

  latestForUser(userId: string) {
    return db
      .selectFrom('email_verification_tokens')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
  },
};
