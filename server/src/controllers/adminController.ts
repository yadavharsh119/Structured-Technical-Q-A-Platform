import type { Request, Response } from 'express';
import {
  adminRoleUpdateSchema,
  adminUserActionSchema,
  adminUserListQuerySchema,
  auditLogQuerySchema,
  type AdminRoleUpdateInput,
  type AdminUserActionInput,
} from '@structured-qa/shared';
import { adminService } from '../services/adminService';
import { auditService } from '../services/auditService';
import {
  asyncHandler,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(adminUserListQuerySchema, req.query);
  const result = await adminService.listUsers(query);
  res.status(200).json({ success: true, data: result });
});

export const changeRole = asyncHandler(async (req: Request, res: Response) => {
  const targetId = parseUuidParam(req.params.id, 'user id');
  const actorId = requireAuthUserId(req);

  let input: AdminRoleUpdateInput;
  try {
    input = parseBody(adminRoleUpdateSchema, req.body);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'admin.user_role_changed',
      targetType: 'user',
      targetId,
      ip: req.ip,
      result: 'failure',
      metadata: { error: 'VALIDATION_ERROR' },
    });
    throw err;
  }

  const user = await adminService.changeRole(actorId, targetId, input, req.ip);
  res.status(200).json({ success: true, data: { user } });
});

export const applyUserAction = asyncHandler(async (req: Request, res: Response) => {
  const targetId = parseUuidParam(req.params.id, 'user id');
  const actorId = requireAuthUserId(req);

  let input: AdminUserActionInput;
  try {
    input = parseBody(adminUserActionSchema, req.body);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'admin.user_action',
      targetType: 'user',
      targetId,
      ip: req.ip,
      result: 'failure',
      metadata: { error: 'VALIDATION_ERROR' },
    });
    throw err;
  }

  const user = await adminService.applyUserAction(actorId, targetId, input, req.ip);
  res.status(200).json({ success: true, data: { user } });
});

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(auditLogQuerySchema, req.query);
  const result = await adminService.listAuditLogs(query);
  res.status(200).json({ success: true, data: result });
});
