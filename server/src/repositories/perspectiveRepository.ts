import { Selectable } from 'kysely';
import { db } from '../config/database';
import { PerspectivesTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type PerspectiveRow = Selectable<PerspectivesTable>;

// Plain insert shape (status, flagged, deleted_at, created_at and
// search_vector are Generated or nullable-optional in PerspectivesTable)
export interface NewPerspective {
  topic_id: string;
  author_id: string;
  proposed_solution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  code_snippets: Array<{ language: string; code: string }>;
  reference_urls: string[];
}

export const perspectiveRepository = {
  create(data: NewPerspective, dbi: DbHandle = db): Promise<PerspectiveRow> {
    return dbi
      .insertInto('perspectives')
      .values({
        ...data,
        // node-postgres serializes JS arrays as Postgres array literals, which
        // is not valid JSON input for a jsonb column; pass a JSON string instead
        code_snippets: JSON.stringify(data.code_snippets) as unknown as NewPerspective['code_snippets'],
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findByTopicAndAuthor(
    topicId: string,
    authorId: string,
    dbi: DbHandle = db,
  ): Promise<PerspectiveRow | undefined> {
    return dbi
      .selectFrom('perspectives')
      .selectAll()
      .where('topic_id', '=', topicId)
      .where('author_id', '=', authorId)
      .executeTakeFirst();
  },

  findByIdWithAuthor(
    id: string,
    dbi: DbHandle = db,
  ): Promise<(PerspectiveRow & { author_username: string }) | undefined> {
    return dbi
      .selectFrom('perspectives')
      .innerJoin('users', 'users.id', 'perspectives.author_id')
      .selectAll('perspectives')
      .select((eb) => eb.ref('users.username').as('author_username'))
      .where('perspectives.id', '=', id)
      .executeTakeFirst();
  },

  findById(id: string, dbi: DbHandle = db): Promise<PerspectiveRow | undefined> {
    return dbi.selectFrom('perspectives').selectAll().where('id', '=', id).executeTakeFirst();
  },

  findByIdForUpdate(id: string, dbi: DbHandle): Promise<PerspectiveRow | undefined> {
    return dbi
      .selectFrom('perspectives')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .forUpdate()
      .executeTakeFirst();
  },

  listVisibleByTopicId(
    topicId: string,
    includeHidden = false,
    dbi: DbHandle = db,
  ): Promise<Array<PerspectiveRow & { author_username: string }>> {
    let query = dbi
      .selectFrom('perspectives')
      .innerJoin('users', 'users.id', 'perspectives.author_id')
      .selectAll('perspectives')
      .select((eb) => eb.ref('users.username').as('author_username'))
      .where('perspectives.topic_id', '=', topicId)
      .where('perspectives.status', '=', 'visible')
      .where('perspectives.deleted_at', 'is', null);
    if (!includeHidden) {
      query = query.where('perspectives.hidden', '=', false);
    }
    return query.orderBy('perspectives.created_at', 'desc').execute();
  },

  findByIdsVisible(
    ids: string[],
    includeHidden = false,
    dbi: DbHandle = db,
  ): Promise<Array<PerspectiveRow & { author_username: string }>> {
    let query = dbi
      .selectFrom('perspectives')
      .innerJoin('users', 'users.id', 'perspectives.author_id')
      .selectAll('perspectives')
      .select((eb) => eb.ref('users.username').as('author_username'))
      .where('perspectives.id', 'in', ids)
      .where('perspectives.status', '=', 'visible')
      .where('perspectives.deleted_at', 'is', null);
    if (!includeHidden) {
      query = query.where('perspectives.hidden', '=', false);
    }
    return query.execute();
  },

  async hasVote(
    perspectiveId: string,
    userId: string,
    dbi: DbHandle = db,
  ): Promise<boolean> {
    const found = await dbi
      .selectFrom('perspective_votes')
      .select('perspective_id')
      .where('perspective_id', '=', perspectiveId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return found !== undefined;
  },

  async addVote(perspectiveId: string, userId: string, dbi: DbHandle = db): Promise<void> {
    await dbi
      .insertInto('perspective_votes')
      .values({ perspective_id: perspectiveId, user_id: userId })
      .execute();
  },

  async removeVote(perspectiveId: string, userId: string, dbi: DbHandle = db): Promise<void> {
    await dbi
      .deleteFrom('perspective_votes')
      .where('perspective_id', '=', perspectiveId)
      .where('user_id', '=', userId)
      .execute();
  },

  async setHidden(id: string, hidden: boolean, dbi: DbHandle = db): Promise<void> {
    await dbi.updateTable('perspectives').set({ hidden }).where('id', '=', id).execute();
  },

  async countVotesByPerspectiveIds(
    ids: string[],
    dbi: DbHandle = db,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (ids.length === 0) {
      return counts;
    }
    const rows = await dbi
      .selectFrom('perspective_votes')
      .select('perspective_id')
      .where('perspective_id', 'in', ids)
      .execute();
    for (const row of rows) {
      counts.set(row.perspective_id, (counts.get(row.perspective_id) ?? 0) + 1);
    }
    return counts;
  },

  async votedPerspectiveIds(
    userId: string,
    ids: string[],
    dbi: DbHandle = db,
  ): Promise<Set<string>> {
    const voted = new Set<string>();
    if (ids.length === 0) {
      return voted;
    }
    const rows = await dbi
      .selectFrom('perspective_votes')
      .select('perspective_id')
      .where('user_id', '=', userId)
      .where('perspective_id', 'in', ids)
      .execute();
    for (const row of rows) {
      voted.add(row.perspective_id);
    }
    return voted;
  },

  async pendingDeletionRequestIds(ids: string[], dbi: DbHandle = db): Promise<Set<string>> {
    const pending = new Set<string>();
    if (ids.length === 0) {
      return pending;
    }
    const rows = await dbi
      .selectFrom('deletion_requests')
      .select('perspective_id')
      .where('perspective_id', 'in', ids)
      .where('status', '=', 'pending')
      .execute();
    for (const row of rows) {
      pending.add(row.perspective_id);
    }
    return pending;
  },

  async softDelete(id: string, deletedAt: Date, dbi: DbHandle = db): Promise<void> {
    await dbi
      .updateTable('perspectives')
      .set({ deleted_at: deletedAt, status: 'deleted' })
      .where('id', '=', id)
      .execute();
  },

  async deleteVotes(perspectiveId: string, dbi: DbHandle = db): Promise<void> {
    await dbi
      .deleteFrom('perspective_votes')
      .where('perspective_id', '=', perspectiveId)
      .execute();
  },

  async deleteAttachments(perspectiveId: string, dbi: DbHandle = db): Promise<string[]> {
    const rows = await dbi
      .deleteFrom('attachments')
      .where('perspective_id', '=', perspectiveId)
      .returning('stored_path')
      .execute();
    return rows.map((row) => row.stored_path);
  },

  async deleteDeletionRequests(perspectiveId: string, dbi: DbHandle = db): Promise<void> {
    await dbi
      .deleteFrom('deletion_requests')
      .where('perspective_id', '=', perspectiveId)
      .execute();
  },

  async deleteById(id: string, dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('perspectives').where('id', '=', id).execute();
  },
};
