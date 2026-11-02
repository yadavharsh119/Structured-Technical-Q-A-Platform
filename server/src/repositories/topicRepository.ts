import { Selectable } from 'kysely';
import { db } from '../config/database';
import { TopicStatus, TopicsTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type TopicRow = Selectable<TopicsTable>;

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

  async setHidden(id: string, hidden: boolean, dbi: DbHandle = db): Promise<void> {
    await dbi.updateTable('topics').set({ hidden }).where('id', '=', id).execute();
  },
};
