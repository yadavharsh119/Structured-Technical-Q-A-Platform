import { Selectable } from 'kysely';
import { db } from '../config/database';
import type { DbHandle } from './questionRepository';
import type {
  AuditLogsTable,
  UserActionType,
  UserRole,
  UserStatus,
  UserWarningsTable,
  UsersTable,
} from '../types/database';

export type AdminUserRow = Selectable<UsersTable>;
export type UserWarningRow = Selectable<UserWarningsTable>;
export type AuditLogRow = Selectable<AuditLogsTable>;
export type AuditLogRowWithActor = AuditLogRow & { actor_username: string | null };

export interface AdminUserFilters {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  perPage: number;
}

export interface AuditLogFilters {
  actor?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page: number;
  perPage: number;
}

export interface NewUserAction {
  user_id: string;
  admin_id: string;
  action_type: UserActionType;
  reason: string;
  suspended_until: Date | null;
}

export interface NewUserWarning {
  user_id: string;
  issued_by: string;
  reason: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function offsetFor(page: number, perPage: number): number {
  return (page - 1) * perPage;
}

export const adminRepository = {
  async listUsers(
    filters: AdminUserFilters,
  ): Promise<{ users: AdminUserRow[]; total: number }> {
    let listQuery = db.selectFrom('users').selectAll();
    let countQuery = db
      .selectFrom('users')
      .select(({ fn }) => fn.countAll<string>().as('count'));

    if (filters.q) {
      const pattern = `%${filters.q}%`;
      listQuery = listQuery.where((eb) =>
        eb.or([eb('username', 'ilike', pattern), eb('email', 'ilike', pattern)]),
      );
      countQuery = countQuery.where((eb) =>
        eb.or([eb('username', 'ilike', pattern), eb('email', 'ilike', pattern)]),
      );
    }
    if (filters.role) {
      listQuery = listQuery.where('role', '=', filters.role);
      countQuery = countQuery.where('role', '=', filters.role);
    }
    if (filters.status) {
      listQuery = listQuery.where('status', '=', filters.status);
      countQuery = countQuery.where('status', '=', filters.status);
    }

    const [users, countRow] = await Promise.all([
      listQuery
        .orderBy('created_at', 'desc')
        .limit(filters.perPage)
        .offset(offsetFor(filters.page, filters.perPage))
        .execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    return { users, total: Number(countRow.count) };
  },

  findById(id: string, dbi: DbHandle = db): Promise<AdminUserRow | undefined> {
    return dbi.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
  },

  findByIdForUpdate(id: string, dbi: DbHandle = db): Promise<AdminUserRow | undefined> {
    return dbi
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst();
  },

  setRole(
    id: string,
    role: UserRole,
    dbi: DbHandle = db,
  ): Promise<AdminUserRow | undefined> {
    return dbi
      .updateTable('users')
      .set({ role })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  setStatus(
    id: string,
    status: UserStatus,
    suspendedUntil: Date | null,
    dbi: DbHandle = db,
  ): Promise<AdminUserRow | undefined> {
    return dbi
      .updateTable('users')
      .set({ status, suspended_until: suspendedUntil })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  },

  async insertAction(data: NewUserAction, dbi: DbHandle = db): Promise<void> {
    await dbi.insertInto('user_actions').values(data).execute();
  },

  insertWarning(
    data: NewUserWarning,
    dbi: DbHandle = db,
  ): Promise<UserWarningRow> {
    return dbi
      .insertInto('user_warnings')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async listAuditLogs(
    filters: AuditLogFilters,
  ): Promise<{ logs: AuditLogRowWithActor[]; total: number }> {
    let listQuery = db
      .selectFrom('audit_logs')
      .leftJoin('users', 'users.id', 'audit_logs.actor_user_id')
      .select([
        'audit_logs.id',
        'audit_logs.created_at',
        'audit_logs.actor_user_id',
        'users.username as actor_username',
        'audit_logs.action',
        'audit_logs.target_type',
        'audit_logs.target_id',
        'audit_logs.ip_address',
        'audit_logs.result',
        'audit_logs.metadata',
      ]);

    let countQuery = db
      .selectFrom('audit_logs')
      .leftJoin('users', 'users.id', 'audit_logs.actor_user_id')
      .select(({ fn }) => fn.countAll<string>().as('count'));

    if (filters.actor) {
      const actor = filters.actor;
      if (UUID_RE.test(actor)) {
        listQuery = listQuery.where('audit_logs.actor_user_id', '=', actor);
        countQuery = countQuery.where('audit_logs.actor_user_id', '=', actor);
      } else {
        listQuery = listQuery.where('users.username', '=', actor);
        countQuery = countQuery.where('users.username', '=', actor);
      }
    }
    if (filters.action) {
      listQuery = listQuery.where('audit_logs.action', '=', filters.action);
      countQuery = countQuery.where('audit_logs.action', '=', filters.action);
    }
    if (filters.from) {
      listQuery = listQuery.where('audit_logs.created_at', '>=', filters.from);
      countQuery = countQuery.where('audit_logs.created_at', '>=', filters.from);
    }
    if (filters.to) {
      listQuery = listQuery.where('audit_logs.created_at', '<=', filters.to);
      countQuery = countQuery.where('audit_logs.created_at', '<=', filters.to);
    }

    const [logs, countRow] = await Promise.all([
      listQuery
        .orderBy('audit_logs.created_at', 'desc')
        .orderBy('audit_logs.id', 'desc')
        .limit(filters.perPage)
        .offset(offsetFor(filters.page, filters.perPage))
        .execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    return { logs, total: Number(countRow.count) };
  },
};
