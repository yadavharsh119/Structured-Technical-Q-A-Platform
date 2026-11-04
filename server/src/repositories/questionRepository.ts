import { Kysely, Selectable } from 'kysely';
import { db } from '../config/database';
import { Database, QuestionsTable } from '../types/database';

export type QuestionRow = Selectable<QuestionsTable>;

export type NewQuestion = Pick<
  QuestionsTable,
  'author_id' | 'title' | 'description' | 'category_id' | 'tech_stack'
>;

export type QuestionUpdate = Partial<
  Pick<QuestionsTable, 'title' | 'description' | 'category_id' | 'tech_stack'>
>;

// A Kysely transaction is assignable to Kysely<Database>, so transactional
// callers (question approval) can pass their trx handle here.
export type DbHandle = Kysely<Database>;

async function insertQuestionTags(dbi: DbHandle, questionId: string, tagIds: string[]) {
  if (tagIds.length === 0) {
    return;
  }
  await dbi
    .insertInto('question_tags')
    .values(tagIds.map((tag_id) => ({ question_id: questionId, tag_id })))
    .execute();
}

export const questionRepository = {
  async create(data: NewQuestion, tagIds: string[]): Promise<QuestionRow> {
    return db.transaction().execute(async (trx) => {
      const question = await trx
        .insertInto('questions')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
      await insertQuestionTags(trx, question.id, tagIds);
      return question;
    });
  },

  findById(id: string, dbi: DbHandle = db): Promise<QuestionRow | undefined> {
    return dbi.selectFrom('questions').selectAll().where('id', '=', id).executeTakeFirst();
  },

  findByIdForUpdate(id: string, dbi: DbHandle = db): Promise<QuestionRow | undefined> {
    return dbi
      .selectFrom('questions')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst();
  },

  update(id: string, data: QuestionUpdate, dbi: DbHandle = db): Promise<QuestionRow> {
    return dbi
      .updateTable('questions')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async replaceTags(questionId: string, tagIds: string[], dbi: DbHandle = db): Promise<void> {
    await dbi.transaction().execute(async (trx) => {
      await trx.deleteFrom('question_tags').where('question_id', '=', questionId).execute();
      await insertQuestionTags(trx, questionId, tagIds);
    });
  },

  async remove(id: string, dbi: DbHandle = db): Promise<void> {
    await dbi.deleteFrom('questions').where('id', '=', id).execute();
  },

  listByAuthor(authorId: string): Promise<QuestionRow[]> {
    return db
      .selectFrom('questions')
      .selectAll()
      .where('author_id', '=', authorId)
      .orderBy('created_at', 'desc')
      .execute();
  },

  listPending(): Promise<Array<QuestionRow & { author_username: string }>> {
    return db
      .selectFrom('questions')
      .innerJoin('users', 'users.id', 'questions.author_id')
      .selectAll('questions')
      .select((eb) => eb.ref('users.username').as('author_username'))
      .where('questions.status', '=', 'pending')
      .orderBy('questions.created_at', 'asc')
      .execute();
  },

  listApprovedByTopicId(topicId: string): Promise<Array<QuestionRow & { author_username: string }>> {
    return db
      .selectFrom('questions')
      .innerJoin('users', 'users.id', 'questions.author_id')
      .selectAll('questions')
      .select((eb) => eb.ref('users.username').as('author_username'))
      .where('questions.topic_id', '=', topicId)
      .where('questions.status', '=', 'approved')
      .orderBy('questions.created_at', 'desc')
      .execute();
  },

  markApproved(
    id: string,
    topicId: string,
    reviewerId: string,
    dbi: DbHandle = db,
  ): Promise<QuestionRow> {
    return dbi
      .updateTable('questions')
      .set({
        status: 'approved',
        topic_id: topicId,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  markRejected(
    id: string,
    reason: string,
    reviewerId: string,
    dbi: DbHandle = db,
  ): Promise<QuestionRow> {
    return dbi
      .updateTable('questions')
      .set({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async moveToTopic(
    sourceTopicId: string,
    destinationTopicId: string,
    dbi: DbHandle = db,
  ): Promise<void> {
    await dbi
      .updateTable('questions')
      .set({ topic_id: destinationTopicId })
      .where('topic_id', '=', sourceTopicId)
      .execute();
  },
};
