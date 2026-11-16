import type {
  AdminPerspectiveDeleteInput,
  DeletionRequestCreateInput,
  DeletionRequestDecisionInput,
} from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  deletionRequestRepository,
  type DeletionRequestRow,
  type DeletionRequestRowWithDetails,
} from '../repositories/deletionRequestRepository';
import { perspectiveRepository } from '../repositories/perspectiveRepository';
import { auditService } from './auditService';
import { storageService } from './storageService';

export interface DeletionRequestDto {
  id: string;
  perspectiveId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionNote: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  requester: { id: string; username: string };
  decidedBy: { id: string; username: string } | null;
  perspective: {
    id: string;
    topicId: string;
    proposedSolution: string;
    explanation: string;
    authorUsername: string;
    deletedAt: Date | null;
  };
}

function perspectiveNotFound(): AppError {
  return new AppError('Perspective not found.', 404, 'PERSPECTIVE_NOT_FOUND');
}

function requestNotFound(): AppError {
  return new AppError('Deletion request not found.', 404, 'DELETION_REQUEST_NOT_FOUND');
}

function notAuthor(): AppError {
  return new AppError('Only the author can request deletion.', 403, 'FORBIDDEN');
}

function pendingExists(): AppError {
  return new AppError(
    'A deletion request for this perspective is already pending review.',
    409,
    'DELETION_REQUEST_PENDING',
  );
}

function alreadyDecided(): AppError {
  return new AppError(
    'This deletion request has already been decided.',
    409,
    'DELETION_REQUEST_ALREADY_DECIDED',
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  );
}

function toDto(row: DeletionRequestRowWithDetails): DeletionRequestDto {
  return {
    id: row.id,
    perspectiveId: row.perspective_id,
    reason: row.reason,
    status: row.status,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    requester: { id: row.requester_id, username: row.requester_username },
    decidedBy:
      row.decided_by && row.decider_username
        ? { id: row.decided_by, username: row.decider_username }
        : null,
    perspective: {
      id: row.perspective_id,
      topicId: row.perspective_topic_id,
      proposedSolution: row.perspective_proposed_solution,
      explanation: row.perspective_explanation,
      authorUsername: row.perspective_author_username,
      deletedAt: row.perspective_deleted_at,
    },
  };
}

async function requestDeletion(
  perspectiveId: string,
  requesterId: string,
  input: DeletionRequestCreateInput,
  ip: string | null,
): Promise<DeletionRequestDto> {
  const perspective = await perspectiveRepository.findById(perspectiveId);
  if (!perspective || perspective.deleted_at !== null) {
    throw perspectiveNotFound();
  }
  if (perspective.author_id !== requesterId) {
    throw notAuthor();
  }

  const existing = await deletionRequestRepository.findPendingByPerspectiveId(perspectiveId);
  if (existing) {
    throw pendingExists();
  }

  let row: DeletionRequestRow;
  try {
    row = await deletionRequestRepository.create({
      perspective_id: perspectiveId,
      requester_id: requesterId,
      reason: input.reason,
    });
  } catch (err) {
    // Race: two requests for the same perspective were submitted at once.
    if (isUniqueViolation(err)) {
      throw pendingExists();
    }
    throw err;
  }

  await auditService.log({
    actorUserId: requesterId,
    action: 'perspective.deletion_request.create',
    targetType: 'perspective',
    targetId: perspectiveId,
    ip,
    result: 'success',
    metadata: { requestId: row.id, reason: input.reason },
  });

  const withDetails = await deletionRequestRepository.findByIdWithDetails(row.id);
  if (!withDetails) {
    throw requestNotFound();
  }
  return toDto(withDetails);
}

async function list(status?: 'pending' | 'approved' | 'rejected'): Promise<DeletionRequestDto[]> {
  const rows = await deletionRequestRepository.list(status);
  return rows.map(toDto);
}

async function decide(
  requestId: string,
  adminId: string,
  input: DeletionRequestDecisionInput,
  ip: string | null,
): Promise<DeletionRequestDto> {
  const decidedAt = new Date();

  await db.transaction().execute(async (trx) => {
    const request = await deletionRequestRepository.findByIdForUpdate(requestId, trx);
    if (!request) {
      throw requestNotFound();
    }
    if (request.status !== 'pending') {
      throw alreadyDecided();
    }

    const perspective = await perspectiveRepository.findByIdForUpdate(
      request.perspective_id,
      trx,
    );
    if (!perspective) {
      throw perspectiveNotFound();
    }

    const status = input.decision === 'approve' ? 'approved' : 'rejected';
    if (input.decision === 'approve') {
      await perspectiveRepository.softDelete(perspective.id, decidedAt, trx);
    }
    await deletionRequestRepository.updateDecision(
      requestId,
      {
        status,
        decided_by: adminId,
        decision_note: input.note ?? null,
        decided_at: decidedAt,
      },
      trx,
    );

    await auditService.log(
      {
        actorUserId: adminId,
        action: `perspective.deletion_request.${input.decision}`,
        targetType: 'perspective',
        targetId: request.perspective_id,
        ip,
        result: 'success',
        metadata: {
          requestId,
          decision: input.decision,
          note: input.note ?? null,
          reason: request.reason,
        },
      },
      trx,
    );
  });

  const updated = await deletionRequestRepository.findByIdWithDetails(requestId);
  if (!updated) {
    throw requestNotFound();
  }
  return toDto(updated);
}

async function adminDelete(
  perspectiveId: string,
  adminId: string,
  input: AdminPerspectiveDeleteInput,
  hard: boolean,
  ip: string | null,
): Promise<{ id: string; hard: boolean }> {
  const deletedAt = new Date();
  let attachmentNames: string[] = [];

  await db.transaction().execute(async (trx) => {
    const perspective = await perspectiveRepository.findByIdForUpdate(perspectiveId, trx);
    if (!perspective) {
      throw perspectiveNotFound();
    }

    if (hard) {
      attachmentNames = await perspectiveRepository.deleteAttachments(perspectiveId, trx);
      await perspectiveRepository.deleteVotes(perspectiveId, trx);
      await perspectiveRepository.deleteDeletionRequests(perspectiveId, trx);
      // Legacy table from 004 has no ON DELETE CASCADE.
      await trx
        .deleteFrom('perspective_deletion_requests')
        .where('perspective_id', '=', perspectiveId)
        .execute();
      await perspectiveRepository.deleteById(perspectiveId, trx);
    } else {
      await perspectiveRepository.softDelete(perspectiveId, deletedAt, trx);
    }

    await auditService.log(
      {
        actorUserId: adminId,
        action: hard ? 'perspective.admin_delete.hard' : 'perspective.admin_delete.soft',
        targetType: 'perspective',
        targetId: perspectiveId,
        ip,
        result: 'success',
        metadata: { reason: input.reason, hard },
      },
      trx,
    );
  });

  if (hard) {
    // Best-effort file cleanup after the database commit.
    await Promise.all(
      attachmentNames.map(async (storedName) => {
        try {
          await storageService.remove(storedName);
        } catch {
          // The attachment file may already be missing.
        }
      }),
    );
  }

  return { id: perspectiveId, hard };
}

export const deletionRequestService = {
  requestDeletion,
  list,
  decide,
  adminDelete,
};
