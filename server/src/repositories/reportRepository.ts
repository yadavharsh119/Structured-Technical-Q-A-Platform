import { Selectable } from 'kysely';
import { db } from '../config/database';
import type { DbHandle } from './questionRepository';
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  ReportsTable,
} from '../types/database';

export type ReportRow = Selectable<ReportsTable>;
export type ReportRowWithReporter = ReportRow & { reporter_username: string };

export interface NewReport {
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  comment: string | null;
}

export const reportRepository = {
  create(data: NewReport, dbi: DbHandle = db): Promise<ReportRow> {
    return dbi.insertInto('reports').values(data).returningAll().executeTakeFirstOrThrow();
  },

  findByReporterAndTarget(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string,
    dbi: DbHandle = db,
  ): Promise<ReportRow | undefined> {
    return dbi
      .selectFrom('reports')
      .selectAll()
      .where('reporter_id', '=', reporterId)
      .where('target_type', '=', targetType)
      .where('target_id', '=', targetId)
      .executeTakeFirst();
  },

  findByIdWithReporter(
    id: string,
    dbi: DbHandle = db,
  ): Promise<ReportRowWithReporter | undefined> {
    return dbi
      .selectFrom('reports')
      .innerJoin('users', 'users.id', 'reports.reporter_id')
      .selectAll('reports')
      .select((eb) => eb.ref('users.username').as('reporter_username'))
      .where('reports.id', '=', id)
      .executeTakeFirst();
  },

  findByIdForUpdate(id: string, dbi: DbHandle): Promise<ReportRow | undefined> {
    return dbi
      .selectFrom('reports')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst();
  },

  list(status?: ReportStatus, dbi: DbHandle = db): Promise<ReportRowWithReporter[]> {
    let query = dbi
      .selectFrom('reports')
      .innerJoin('users', 'users.id', 'reports.reporter_id')
      .selectAll('reports')
      .select((eb) => eb.ref('users.username').as('reporter_username'));
    if (status !== undefined) {
      query = query.where('reports.status', '=', status);
    }
    return query.orderBy('reports.created_at', 'asc').execute();
  },

  updateStatus(
    id: string,
    status: ReportStatus,
    resolvedBy: string | null,
    dbi: DbHandle = db,
  ): Promise<ReportRow> {
    return dbi
      .updateTable('reports')
      .set({ status, resolved_by: resolvedBy })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },
};
