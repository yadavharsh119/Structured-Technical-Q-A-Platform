import { Selectable } from 'kysely';
import { db } from '../config/database';
import type { DeletionRequestsTable, RequestStatus } from '../types/database';
import type { DbHandle } from './questionRepository';

export type DeletionRequestRow = Selectable<DeletionRequestsTable>;

export type DeletionRequestRowWithDetails = DeletionRequestRow & {
  requester_username: string;
  decider_username: string | null;
  perspective_proposed_solution: string;
  perspective_explanation: string;
  perspective_topic_id: string;
  perspective_author_id: string;
  perspective_author_username: string;
  perspective_deleted_at: Date | null;
};

export interface NewDeletionRequest {
  perspective_id: string;
  requester_id: string;
  reason: string;
}

function withDetails(dbi: DbHandle) {
  return dbi
    .selectFrom('deletion_requests')
    .innerJoin('perspectives', 'perspectives.id', 'deletion_requests.perspective_id')
    .innerJoin('users as requester', 'requester.id', 'deletion_requests.requester_id')
    .innerJoin('users as author', 'author.id', 'perspectives.author_id')
    .leftJoin('users as decider', 'decider.id', 'deletion_requests.decided_by')
    .selectAll('deletion_requests')
    .select([
      'requester.username as requester_username',
      'decider.username as decider_username',
      'perspectives.proposed_solution as perspective_proposed_solution',
      'perspectives.explanation as perspective_explanation',
      'perspectives.topic_id as perspective_topic_id',
      'perspectives.author_id as perspective_author_id',
      'author.username as perspective_author_username',
      'perspectives.deleted_at as perspective_deleted_at',
    ]);
}

export const deletionRequestRepository = {
  create(data: NewDeletionRequest, dbi: DbHandle = db): Promise<DeletionRequestRow> {
    return dbi
      .insertInto('deletion_requests')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findPendingByPerspectiveId(
    perspectiveId: string,
    dbi: DbHandle = db,
  ): Promise<DeletionRequestRow | undefined> {
    return dbi
      .selectFrom('deletion_requests')
      .selectAll()
      .where('perspective_id', '=', perspectiveId)
      .where('status', '=', 'pending')
      .executeTakeFirst();
  },

  findByIdForUpdate(id: string, dbi: DbHandle): Promise<DeletionRequestRow | undefined> {
    return dbi
      .selectFrom('deletion_requests')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst();
  },

  findByIdWithDetails(
    id: string,
    dbi: DbHandle = db,
  ): Promise<DeletionRequestRowWithDetails | undefined> {
    return withDetails(dbi).where('deletion_requests.id', '=', id).executeTakeFirst();
  },

  list(status?: RequestStatus, dbi: DbHandle = db): Promise<DeletionRequestRowWithDetails[]> {
    let query = withDetails(dbi);
    if (status) {
      query = query.where('deletion_requests.status', '=', status);
    }
    return query.orderBy('deletion_requests.created_at', 'desc').execute();
  },

  async updateDecision(
    id: string,
    decision: {
      status: RequestStatus;
      decided_by: string;
      decision_note: string | null;
      decided_at: Date;
    },
    dbi: DbHandle = db,
  ): Promise<void> {
    await dbi
      .updateTable('deletion_requests')
      .set(decision)
      .where('id', '=', id)
      .execute();
  },
};
