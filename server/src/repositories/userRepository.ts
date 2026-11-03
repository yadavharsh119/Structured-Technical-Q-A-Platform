import { Selectable, Updateable } from 'kysely';
import { db } from '../config/database';
import { UsersTable } from '../types/database';

export type NewUser = Pick<UsersTable, 'full_name' | 'username' | 'email' | 'password_hash'>;

// Select results unwrap Generated<>/ColumnType wrappers
export type UserRow = Selectable<UsersTable>;

export type UserProfileUpdate = Pick<
  Updateable<UsersTable>,
  'full_name' | 'username' | 'bio' | 'technical_skills' | 'areas_of_interest' | 'email_public'
>;

export interface UserStats {
  questionsSubmitted: number;
  perspectivesSubmitted: number;
  totalUpvotesReceived: number;
}

export const userRepository = {
  findByEmail(email: string): Promise<UserRow | undefined> {
    // users.email is citext, so the comparison is case-insensitive
    return db.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst();
  },

  findByUsername(username: string): Promise<UserRow | undefined> {
    // users.username is citext, so the comparison is case-insensitive
    return db.selectFrom('users').selectAll().where('username', '=', username).executeTakeFirst();
  },

  findByIdentifier(identifier: string): Promise<UserRow | undefined> {
    return db
      .selectFrom('users')
      .selectAll()
      .where((eb) => eb.or([eb('email', '=', identifier), eb('username', '=', identifier)]))
      .executeTakeFirst();
  },

  findById(id: string): Promise<UserRow | undefined> {
    return db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
  },

  async create(data: NewUser): Promise<UserRow> {
    return db.insertInto('users').values(data).returningAll().executeTakeFirstOrThrow();
  },

  async updateProfile(id: string, data: UserProfileUpdate): Promise<void> {
    if (Object.keys(data).length === 0) {
      return;
    }
    await db.updateTable('users').set(data).where('id', '=', id).execute();
  },

  async getStats(userId: string): Promise<UserStats> {
    const [questions, perspectives, upvotes] = await Promise.all([
      db
        .selectFrom('questions')
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('author_id', '=', userId)
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('perspectives')
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('author_id', '=', userId)
        .where('status', '=', 'visible')
        .where('hidden', '=', false)
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('perspectives')
        .innerJoin('perspective_votes', 'perspective_votes.perspective_id', 'perspectives.id')
        .select(({ fn }) => fn.count<number>('perspective_votes.user_id').as('count'))
        .where('perspectives.author_id', '=', userId)
        .where('perspectives.status', '=', 'visible')
        .where('perspectives.hidden', '=', false)
        .executeTakeFirstOrThrow(),
    ]);

    return {
      questionsSubmitted: Number(questions.count),
      perspectivesSubmitted: Number(perspectives.count),
      totalUpvotesReceived: Number(upvotes.count),
    };
  },

  async markEmailVerified(id: string): Promise<void> {
    await db
      .updateTable('users')
      .set({ email_verified_at: new Date() })
      .where('id', '=', id)
      .execute();
  },

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await db
      .updateTable('users')
      .set({ password_hash: passwordHash })
      .where('id', '=', id)
      .execute();
  },

  async updateLoginSuccess(id: string): Promise<void> {
    await db
      .updateTable('users')
      .set({ last_login_at: new Date(), failed_login_attempts: 0, locked_until: null })
      .where('id', '=', id)
      .execute();
  },

  async incrementFailedAttempts(id: string): Promise<number> {
    const row = await db
      .updateTable('users')
      .set((eb) => ({ failed_login_attempts: eb('failed_login_attempts', '+', 1) }))
      .where('id', '=', id)
      .returning('failed_login_attempts')
      .executeTakeFirstOrThrow();
    return row.failed_login_attempts;
  },

  async lockUntil(id: string, date: Date): Promise<void> {
    await db
      .updateTable('users')
      .set({ locked_until: date, failed_login_attempts: 0 })
      .where('id', '=', id)
      .execute();
  },

  async setSessionsValidAfter(id: string, date: Date): Promise<void> {
    await db
      .updateTable('users')
      .set({ sessions_valid_after: date })
      .where('id', '=', id)
      .execute();
  },

  async setFingerprintPublic(id: string, fingerprintPublic: boolean): Promise<void> {
    await db
      .updateTable('users')
      .set({ fingerprint_public: fingerprintPublic })
      .where('id', '=', id)
      .execute();
  },
};
