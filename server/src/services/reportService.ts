import type { ReportAction, ReportCreateInput, ReportListQuery } from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { perspectiveRepository } from '../repositories/perspectiveRepository';
import { reportRepository, type ReportRowWithReporter } from '../repositories/reportRepository';
import { topicRepository } from '../repositories/topicRepository';

export interface ReportedTopicDto {
  type: 'topic';
  id: string;
  title: string;
  slug: string;
  description: string;
  hidden: boolean;
}

export interface ReportedPerspectiveDto {
  type: 'perspective';
  id: string;
  topicId: string;
  proposedSolution: string;
  explanation: string;
  authorUsername: string;
  hidden: boolean;
}

export interface ReportDto {
  id: string;
  reporter: {
    id: string;
    username: string;
  };
  targetType: 'topic' | 'perspective';
  targetId: string;
  reason: string;
  comment: string | null;
  status: string;
  createdAt: Date;
  target: ReportedTopicDto | ReportedPerspectiveDto | null;
}

function targetNotFound(): AppError {
  return new AppError('Reported content not found.', 404, 'TARGET_NOT_FOUND');
}

function reportNotFound(): AppError {
  return new AppError('Report not found.', 404, 'REPORT_NOT_FOUND');
}

function selfReport(): AppError {
  return new AppError('You cannot report your own content.', 403, 'SELF_REPORT');
}

function duplicateReport(): AppError {
  return new AppError('You have already reported this content.', 409, 'REPORT_ALREADY_EXISTS');
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  );
}

async function toDto(row: ReportRowWithReporter): Promise<ReportDto> {
  const target =
    row.target_type === 'topic'
      ? await topicRepository.findById(row.target_id).then((topic) =>
          topic
            ? {
                type: 'topic' as const,
                id: topic.id,
                title: topic.title,
                slug: topic.slug,
                description: topic.description,
                hidden: topic.hidden,
              }
            : null,
        )
      : await perspectiveRepository.findByIdWithAuthor(row.target_id).then((perspective) =>
          perspective
            ? {
                type: 'perspective' as const,
                id: perspective.id,
                topicId: perspective.topic_id,
                proposedSolution: perspective.proposed_solution,
                explanation: perspective.explanation,
                authorUsername: perspective.author_username,
                hidden: perspective.hidden,
              }
            : null,
        );

  return {
    id: row.id,
    reporter: {
      id: row.reporter_id,
      username: row.reporter_username,
    },
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
    target,
  };
}

async function create(input: ReportCreateInput, reporterId: string): Promise<ReportDto> {
  if (input.targetType === 'topic') {
    const topic = await topicRepository.findById(input.targetId);
    if (!topic) {
      throw targetNotFound();
    }
    if (topic.created_by === reporterId) {
      throw selfReport();
    }
  } else {
    const perspective = await perspectiveRepository.findById(input.targetId);
    if (!perspective) {
      throw targetNotFound();
    }
    if (perspective.author_id === reporterId) {
      throw selfReport();
    }
  }

  const existing = await reportRepository.findByReporterAndTarget(
    reporterId,
    input.targetType,
    input.targetId,
  );
  if (existing) {
    throw duplicateReport();
  }

  try {
    await reportRepository.create({
      reporter_id: reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      comment: input.comment ?? null,
    });
  } catch (err) {
    // Race: the same user submitted the same report twice concurrently
    if (isUniqueViolation(err)) {
      throw duplicateReport();
    }
    throw err;
  }

  const row = await reportRepository.findByReporterAndTarget(
    reporterId,
    input.targetType,
    input.targetId,
  );
  if (!row) {
    throw new AppError('Report could not be loaded.', 500, 'REPORT_LOAD_FAILED');
  }
  const withReporter = await reportRepository.findByIdWithReporter(row.id);
  if (!withReporter) {
    throw new AppError('Report could not be loaded.', 500, 'REPORT_LOAD_FAILED');
  }
  return toDto(withReporter);
}

async function list(query: ReportListQuery): Promise<ReportDto[]> {
  const rows = await reportRepository.list(query.status);
  return Promise.all(rows.map((row) => toDto(row)));
}

async function act(
  reportId: string,
  action: ReportAction,
  actorId: string,
): Promise<ReportDto> {
  await db.transaction().execute(async (trx) => {
    const report = await reportRepository.findByIdForUpdate(reportId, trx);
    if (!report) {
      throw reportNotFound();
    }

    if (action === 'hide') {
      if (report.target_type === 'topic') {
        const topic = await topicRepository.findById(report.target_id, trx);
        if (!topic) {
          throw targetNotFound();
        }
        await topicRepository.setHidden(topic.id, true, trx);
      } else {
        const perspective = await perspectiveRepository.findById(report.target_id, trx);
        if (!perspective) {
          throw targetNotFound();
        }
        await perspectiveRepository.setHidden(perspective.id, true, trx);
      }
    }

    const status =
      action === 'dismiss' ? 'dismissed' : action === 'hide' ? 'resolved' : 'under_review';
    const resolvedBy = action === 'escalate' ? null : actorId;
    await reportRepository.updateStatus(reportId, status, resolvedBy, trx);
  });

  const updated = await reportRepository.findByIdWithReporter(reportId);
  if (!updated) {
    throw reportNotFound();
  }
  return toDto(updated);
}

export const reportService = {
  create,
  list,
  act,
};
