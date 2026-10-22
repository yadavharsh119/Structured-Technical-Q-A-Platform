import { Selectable } from 'kysely';
import { db } from '../config/database';
import { TagsTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type TagRow = Selectable<TagsTable>;

export const tagRepository = {
  listActive(): Promise<TagRow[]> {
    return db.selectFrom('tags').selectAll().where('is_active', '=', true).execute();
  },

  async findByIds(ids: string[]): Promise<TagRow[]> {
    if (ids.length === 0) {
      return [];
    }
    return db.selectFrom('tags').selectAll().where('id', 'in', ids).execute();
  },

  async namesByQuestionIds(
    questionIds: string[],
    dbi: DbHandle = db,
  ): Promise<Map<string, string[]>> {
    const names = new Map<string, string[]>();
    if (questionIds.length === 0) {
      return names;
    }
    const rows = await dbi
      .selectFrom('question_tags')
      .innerJoin('tags', 'tags.id', 'question_tags.tag_id')
      .select(['question_tags.question_id', 'tags.name'])
      .where('question_tags.question_id', 'in', questionIds)
      .execute();
    for (const row of rows) {
      const list = names.get(row.question_id) ?? [];
      list.push(row.name);
      names.set(row.question_id, list);
    }
    return names;
  },

  async namesByTopicIds(topicIds: string[], dbi: DbHandle = db): Promise<Map<string, string[]>> {
    const names = new Map<string, string[]>();
    if (topicIds.length === 0) {
      return names;
    }
    const rows = await dbi
      .selectFrom('topic_tags')
      .innerJoin('tags', 'tags.id', 'topic_tags.tag_id')
      .select(['topic_tags.topic_id', 'tags.name'])
      .where('topic_tags.topic_id', 'in', topicIds)
      .execute();
    for (const row of rows) {
      const list = names.get(row.topic_id) ?? [];
      list.push(row.name);
      names.set(row.topic_id, list);
    }
    return names;
  },
};
