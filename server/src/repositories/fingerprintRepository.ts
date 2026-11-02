import { Selectable } from 'kysely';
import { db } from '../config/database';
import type { ExpertFingerprintsTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type FingerprintRow = Selectable<ExpertFingerprintsTable>;
export type FingerprintRowWithCategory = FingerprintRow & { category_name: string };

export interface EligiblePerspectiveRow {
  user_id: string;
  perspective_id: string;
  category_id: string;
  category_name: string;
  created_at: Date;
  upvotes: number;
}

export interface NewFingerprintRow {
  user_id: string;
  category_id: string;
  perspective_count: number;
  upvote_total: number;
  score: number;
  rank: number;
}

export const fingerprintRepository = {
  async listEligiblePerspectivesForUser(
    userId: string,
    dbi: DbHandle = db,
  ): Promise<EligiblePerspectiveRow[]> {
    const rows = await dbi
      .selectFrom('perspectives')
      .innerJoin('topics', 'topics.id', 'perspectives.topic_id')
      .innerJoin('categories', 'categories.id', 'topics.category_id')
      .leftJoin('perspective_votes', 'perspective_votes.perspective_id', 'perspectives.id')
      .select([
        'perspectives.author_id as user_id',
        'perspectives.id as perspective_id',
        'topics.category_id as category_id',
        'categories.name as category_name',
        'perspectives.created_at as created_at',
      ])
      .select(({ fn }) => fn.count<number>('perspective_votes.user_id').as('upvotes'))
      .where('perspectives.author_id', '=', userId)
      .where('perspectives.status', '=', 'visible')
      .where('perspectives.hidden', '=', false)
      .where('topics.status', '=', 'published')
      .where('topics.hidden', '=', false)
      .groupBy([
        'perspectives.author_id',
        'perspectives.id',
        'topics.category_id',
        'categories.name',
        'perspectives.created_at',
      ])
      .execute();

    return rows.map((row) => ({ ...row, upvotes: Number(row.upvotes) }));
  },

  async listUserIdsWithEligiblePerspectives(dbi: DbHandle = db): Promise<string[]> {
    const rows = await dbi
      .selectFrom('perspectives')
      .innerJoin('topics', 'topics.id', 'perspectives.topic_id')
      .select('perspectives.author_id as user_id')
      .where('perspectives.status', '=', 'visible')
      .where('perspectives.hidden', '=', false)
      .where('topics.status', '=', 'published')
      .where('topics.hidden', '=', false)
      .distinct()
      .execute();
    return rows.map((row) => row.user_id);
  },

  findTopByUser(userId: string, dbi: DbHandle = db): Promise<FingerprintRowWithCategory[]> {
    return dbi
      .selectFrom('expert_fingerprints')
      .innerJoin('categories', 'categories.id', 'expert_fingerprints.category_id')
      .selectAll('expert_fingerprints')
      .select('categories.name as category_name')
      .where('expert_fingerprints.user_id', '=', userId)
      .orderBy('expert_fingerprints.rank', 'asc')
      .limit(3)
      .execute();
  },

  async topCategoryLabelsByUserIds(
    userIds: string[],
    dbi: DbHandle = db,
  ): Promise<Map<string, string>> {
    const labels = new Map<string, string>();
    if (userIds.length === 0) return labels;

    const rows = await dbi
      .selectFrom('expert_fingerprints')
      .innerJoin('categories', 'categories.id', 'expert_fingerprints.category_id')
      .innerJoin('users', 'users.id', 'expert_fingerprints.user_id')
      .select([
        'expert_fingerprints.user_id as user_id',
        'categories.name as category_name',
      ])
      .where('expert_fingerprints.user_id', 'in', userIds)
      .where('expert_fingerprints.rank', '=', 1)
      .where('users.fingerprint_public', '=', true)
      .execute();

    for (const row of rows) {
      labels.set(row.user_id, row.category_name);
    }
    return labels;
  },

  async replaceForUser(
    userId: string,
    rows: NewFingerprintRow[],
    calculatedAt: Date,
    dbi: DbHandle = db,
  ): Promise<void> {
    await dbi.deleteFrom('expert_fingerprints').where('user_id', '=', userId).execute();
    if (rows.length === 0) return;

    await dbi
      .insertInto('expert_fingerprints')
      .values(
        rows.map((row) => ({
          ...row,
          score: row.score.toFixed(6),
          calculated_at: calculatedAt,
        })),
      )
      .execute();
  },

  async deleteAll(dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('expert_fingerprints').execute();
  },
};
