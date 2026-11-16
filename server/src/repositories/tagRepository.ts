import { Selectable } from 'kysely';
import { db } from '../config/database';
import { TagsTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type TagRow = Selectable<TagsTable>;

export type NewTag = Pick<TagsTable, 'name'>;

export type TagUpdate = Partial<Pick<TagsTable, 'name'>> & {
  is_active?: boolean;
};

export const tagRepository = {
  listActive(): Promise<TagRow[]> {
    return db
      .selectFrom('tags')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();
  },

  listAll(): Promise<TagRow[]> {
    return db.selectFrom('tags').selectAll().orderBy('name', 'asc').execute();
  },

  findById(id: string, dbi: DbHandle = db): Promise<TagRow | undefined> {
    return dbi.selectFrom('tags').selectAll().where('id', '=', id).executeTakeFirst();
  },

  findByName(name: string, dbi: DbHandle = db): Promise<TagRow | undefined> {
    // tags.name is CITEXT, so this comparison is case-insensitive.
    return dbi.selectFrom('tags').selectAll().where('name', '=', name).executeTakeFirst();
  },

  async findByIds(ids: string[]): Promise<TagRow[]> {
    if (ids.length === 0) {
      return [];
    }
    return db.selectFrom('tags').selectAll().where('id', 'in', ids).execute();
  },

  create(data: NewTag, dbi: DbHandle = db): Promise<TagRow> {
    return dbi.insertInto('tags').values(data).returningAll().executeTakeFirstOrThrow();
  },

  update(id: string, data: TagUpdate, dbi: DbHandle = db): Promise<TagRow> {
    return dbi.updateTable('tags').set(data).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
  },

  // Move topic/question links to the destination, skipping rows that would
  // duplicate an existing (content, destination) pairing, then drop the
  // source's links. Must be called inside the merge transaction.
  async moveLinks(sourceId: string, destinationId: string, dbi: DbHandle = db): Promise<void> {
    await dbi
      .insertInto('topic_tags')
      .columns(['topic_id', 'tag_id'])
      .expression((eb) =>
        eb
          .selectFrom('topic_tags')
          .select(['topic_id', eb.val(destinationId).as('tag_id')])
          .where('tag_id', '=', sourceId),
      )
      .onConflict((conflict) => conflict.columns(['topic_id', 'tag_id']).doNothing())
      .execute();

    await dbi.deleteFrom('topic_tags').where('tag_id', '=', sourceId).execute();

    await dbi
      .insertInto('question_tags')
      .columns(['question_id', 'tag_id'])
      .expression((eb) =>
        eb
          .selectFrom('question_tags')
          .select(['question_id', eb.val(destinationId).as('tag_id')])
          .where('tag_id', '=', sourceId),
      )
      .onConflict((conflict) => conflict.columns(['question_id', 'tag_id']).doNothing())
      .execute();

    await dbi.deleteFrom('question_tags').where('tag_id', '=', sourceId).execute();
  },

  deactivate(id: string, dbi: DbHandle = db): Promise<TagRow> {
    return dbi
      .updateTable('tags')
      .set({ is_active: false })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
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
