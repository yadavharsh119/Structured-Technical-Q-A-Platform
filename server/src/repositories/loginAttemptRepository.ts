import { db } from '../config/database';

export const loginAttemptRepository = {
  async record(params: {
    identifier: string;
    ip: string | undefined;
    success: boolean;
  }): Promise<void> {
    await db
      .insertInto('login_attempts')
      .values({
        identifier: params.identifier,
        ip_address: params.ip ?? null,
        success: params.success,
      })
      .execute();
  },

  async countRecentFailuresByIp(ip: string | undefined, minutes: number): Promise<number> {
    if (!ip) return 0;
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const row = await db
      .selectFrom('login_attempts')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .where('ip_address', '=', ip)
      .where('success', '=', false)
      .where('created_at', '>', since)
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  },
};
