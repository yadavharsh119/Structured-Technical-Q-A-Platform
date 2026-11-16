import { Selectable } from 'kysely';
import { db } from '../config/database';
import { TopicSlugRedirectsTable, TopicStatus, TopicsTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type TopicRow = Selectable<TopicsTable>;
export type TopicSlugRedirectRow = Selectable<TopicSlugRedirectsTable>;

export type TopicUpdate = Partial<
  Pick<TopicsTable, 'title' | 'slug' | 'description' | 'category_id' | 'merged_into_topic_id'>
>;

// Plain insert shape (is_curated and status are Generated in TopicsTable)
export interface NewTopic {
  title: string;
  slug: string;
  description: string;
  category_id: string;
  is_curated: boolean;
  status: TopicStatus;
  created_by: string;
}

async function insertTopicTags(dbi: DbHandle, topicId: string, tagIds: string[]) {
  if (tagIds.length === 0) {
    return;
  }
  await dbi
    .insertInto('topic_tags')
    .values(tagIds.map((tag_id) => ({ topic_id: topicId, tag_id })))
    .execute();
}

export const topicRepository = {
  listPublished(includeHidden = false): Promise<TopicRow[]> {
    let query = db
      .selectFrom('topics')
      .selectAll()
      .where('status', '=', 'published')
      .orderBy('created_at', 'asc');
    if (!includeHidden) {
      query = query.where('hidden', '=', false);
    }
    return query.execute();
  },

  findBySlug(slug: string): Promise<TopicRow | undefined> {
    return db.selectFrom('topics').selectAll().where('slug', '=', slug).executeTakeFirst();
  },

  findByTitle(title: string, dbi: DbHandle = db): Promise<TopicRow | undefined> {
    return dbi.selectFrom('topics').selectAll().where('title', '=', title).executeTakeFirst();
  },

  findById(id: string, dbi: DbHandle = db): Promise<TopicRow | undefined> {
    return dbi.selectFrom('topics').selectAll().where('id', '=', id).executeTakeFirst();
  },

  async existsBySlug(slug: string, dbi: DbHandle = db): Promise<boolean> {
    const found = await dbi
      .selectFrom('topics')
      .select('id')
      .where('slug', '=', slug)
      .executeTakeFirst();
    return found !== undefined;
  },

  async existsByTitle(title: string, dbi: DbHandle = db): Promise<boolean> {
    const found = await dbi
      .selectFrom('topics')
      .select('id')
      .where('title', '=', title)
      .executeTakeFirst();
    return found !== undefined;
  },

  async create(data: NewTopic, tagIds: string[], dbi: DbHandle = db): Promise<TopicRow> {
    const topic = await dbi
      .insertInto('topics')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
    await insertTopicTags(dbi, topic.id, tagIds);
    return topic;
  },

  update(id: string, data: TopicUpdate, dbi: DbHandle = db): Promise<TopicRow> {
    return dbi
      .updateTable('topics')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async replaceTags(topicId: string, tagIds: string[], dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('topic_tags').where('topic_id', '=', topicId).execute();
    await insertTopicTags(dbi, topicId, tagIds);
  },

  archive(id: string, dbi: DbHandle = db): Promise<TopicRow> {
    return dbi
      .updateTable('topics')
      .set({ status: 'archived' })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  markMerged(sourceId: string, destinationId: string, dbi: DbHandle = db): Promise<TopicRow> {
    return dbi
      .updateTable('topics')
      .set({ status: 'archived', merged_into_topic_id: destinationId })
      .where('id', '=', sourceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findRedirect(oldSlug: string, dbi: DbHandle = db): Promise<TopicSlugRedirectRow | undefined> {
    return dbi
      .selectFrom('topic_slug_redirects')
      .selectAll()
      .where('old_slug', '=', oldSlug)
      .executeTakeFirst();
  },

  async upsertRedirect(oldSlug: string, topicId: string, dbi: DbHandle = db): Promise<void> {
    await dbi
      .insertInto('topic_slug_redirects')
      .values({ old_slug: oldSlug, topic_id: topicId })
      .onConflict((conflict) =>
        conflict.column('old_slug').doUpdateSet({ topic_id: topicId }),
      )
      .execute();
  },

  async deleteRedirect(oldSlug: string, dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('topic_slug_redirects').where('old_slug', '=', oldSlug).execute();
  },

  async moveLinkedQuestions(
    sourceId: string,
    destinationId: string,
    dbi: DbHandle = db,
  ): Promise<void> {
    await dbi
      .updateTable('topic_questions')
      .set({ topic_id: destinationId })
      .where('topic_id', '=', sourceId)
      .execute();
  },

  async setHidden(id: string, hidden: boolean, dbi: DbHandle = db): Promise<void> {
    await dbi.updateTable('topics').set({ hidden }).where('id', '=', id).execute();
  },
};
