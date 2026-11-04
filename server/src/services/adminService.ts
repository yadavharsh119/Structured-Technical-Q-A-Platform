import type {
  AdminRoleUpdateInput,
  AdminUserActionInput,
  AdminUserListQuery,
  AuditLogQuery,
} from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  adminRepository,
  type AdminUserRow,
  type AuditLogRowWithActor,
} from '../repositories/adminRepository';
import type { UserActionType, UserRole, UserStatus } from '../types/database';
import { auditService } from './auditService';
import { emailService } from './emailService';

const PER_PAGE = 20;

const ACTION_TYPE: Record<AdminUserActionInput['action'], UserActionType> = {
  warn: 'warning',
  suspend: 'suspend',
  ban: 'ban',
  restore: 'restore',
};

export interface AdminUserDto {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  suspendedUntil: Date | null;
  createdAt: Date;
}

export interface AdminUserListResult {
  users: AdminUserDto[];
  page: number;
  perPage: number;
  total: number;
}

export interface AuditLogDto {
  id: string;
  timestamp: Date;
  actorId: string | null;
  actorUsername: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
}

export interface AuditLogListResult {
  logs: AuditLogDto[];
  page: number;
  perPage: number;
  total: number;
}

function userNotFound(): AppError {
  return new AppError('User not found.', 404, 'USER_NOT_FOUND');
}

function selfRoleChange(): AppError {
  return new AppError('You cannot change your own role.', 403, 'SELF_ROLE_CHANGE');
}

function selfAction(): AppError {
  return new AppError('You cannot moderate your own account.', 403, 'SELF_ACTION');
}

function adminTarget(): AppError {
  return new AppError(
    'Administrators cannot be warned, suspended, or banned.',
    403,
    'ADMIN_TARGET',
  );
}

function validation(message: string): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR');
}

function errorCode(err: unknown): string {
  return err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
}

function auditAction(action: AdminUserActionInput['action']): string {
  return `admin.user_${action}`;
}

function toUserDto(row: AdminUserRow): AdminUserDto {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    role: row.role,
    status: row.status,
    suspendedUntil: row.suspended_until,
    createdAt: row.created_at,
  };
}

function toAuditLogDto(row: AuditLogRowWithActor): AuditLogDto {
  return {
    id: row.id,
    timestamp: row.created_at,
    actorId: row.actor_user_id,
    actorUsername: row.actor_username,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    ip: row.ip_address,
    result: row.result,
    details: row.metadata,
  };
}

async function listUsers(query: AdminUserListQuery): Promise<AdminUserListResult> {
  const { users, total } = await adminRepository.listUsers({
    q: query.q,
    role: query.role,
    status: query.status,
    page: query.page,
    perPage: PER_PAGE,
  });

  return {
    users: users.map(toUserDto),
    page: query.page,
    perPage: PER_PAGE,
    total,
  };
}

async function changeRole(
  actorId: string,
  targetId: string,
  input: AdminRoleUpdateInput,
  ip: string | undefined,
): Promise<AdminUserDto> {
  try {
    if (actorId === targetId) {
      throw selfRoleChange();
    }
    const updated = await adminRepository.setRole(targetId, input.role);
    if (!updated) {
      throw userNotFound();
    }

    await auditService.log({
      actorUserId: actorId,
      action: 'admin.user_role_changed',
      targetType: 'user',
      targetId,
      ip,
      result: 'success',
      metadata: { role: input.role },
    });
    return toUserDto(updated);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'admin.user_role_changed',
      targetType: 'user',
      targetId,
      ip,
      result: 'failure',
      metadata: { requestedRole: input.role, error: errorCode(err) },
    });
    throw err;
  }
}

async function applyUserAction(
  actorId: string,
  targetId: string,
  input: AdminUserActionInput,
  ip: string | undefined,
): Promise<AdminUserDto> {
  const actionName = auditAction(input.action);

  try {
    const result = await db.transaction().execute(async (trx) => {
      const target = await adminRepository.findByIdForUpdate(targetId, trx);
      if (!target) {
        throw userNotFound();
      }
      if (target.id === actorId) {
        throw selfAction();
      }
      if (target.role === 'admin' && input.action !== 'restore') {
        throw adminTarget();
      }

      let status: UserStatus = target.status;
      let suspendedUntil: Date | null = null;

      if (input.action === 'suspend') {
        if (input.durationDays === undefined) {
          throw validation('durationDays is required when suspending a user.');
        }
        suspendedUntil = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000);
        status = 'suspended';
      } else if (input.action === 'ban') {
        status = 'banned';
      } else if (input.action === 'restore') {
        status = 'active';
      }

      if (input.action === 'warn') {
        await adminRepository.insertWarning(
          { user_id: targetId, issued_by: actorId, reason: input.reason },
          trx,
        );
      }

      await adminRepository.insertAction(
        {
          user_id: targetId,
          admin_id: actorId,
          action_type: ACTION_TYPE[input.action],
          reason: input.reason,
          suspended_until: suspendedUntil,
        },
        trx,
      );

      const updated =
        input.action === 'warn'
          ? target
          : await adminRepository.setStatus(targetId, status, suspendedUntil, trx);

      if (!updated) {
        throw userNotFound();
      }
      return { user: updated, suspendedUntil };
    });

    await emailService.sendAccountActionEmail(
      result.user.email,
      input.action,
      input.reason,
      result.suspendedUntil,
    );

    await auditService.log({
      actorUserId: actorId,
      action: actionName,
      targetType: 'user',
      targetId,
      ip,
      result: 'success',
      metadata: {
        reason: input.reason,
        ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
        ...(result.suspendedUntil ? { suspendedUntil: result.suspendedUntil.toISOString() } : {}),
      },
    });

    return toUserDto(result.user);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: actionName,
      targetType: 'user',
      targetId,
      ip,
      result: 'failure',
      metadata: {
        reason: input.reason,
        ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
        error: errorCode(err),
      },
    });
    throw err;
  }
}

async function listAuditLogs(query: AuditLogQuery): Promise<AuditLogListResult> {
  const { logs, total } = await adminRepository.listAuditLogs({
    actor: query.actor,
    action: query.action,
    from: query.from,
    to: query.to,
    page: query.page,
    perPage: PER_PAGE,
  });

  return {
    logs: logs.map(toAuditLogDto),
    page: query.page,
    perPage: PER_PAGE,
    total,
  };
}

export const adminService = {
  listUsers,
  changeRole,
  applyUserAction,
  listAuditLogs,
};
