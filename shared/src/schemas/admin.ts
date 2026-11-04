import { z } from 'zod';

// Admin user management and audit log viewer (FR-MOD-03, FR-ADM-01, FR-ADM-03).
// Roles in the database are registered | moderator | admin.

export const ADMIN_USER_ROLES = ['registered', 'moderator', 'admin'] as const;
export const ADMIN_ASSIGNABLE_ROLES = ['registered', 'moderator'] as const;
export const ADMIN_USER_STATUSES = ['active', 'suspended', 'banned', 'deactivated'] as const;
export const ADMIN_USER_ACTIONS = ['warn', 'suspend', 'ban', 'restore'] as const;

export const adminUserListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.enum(ADMIN_USER_ROLES).optional(),
  status: z.enum(ADMIN_USER_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminRoleUpdateSchema = z.object({
  role: z.enum(ADMIN_ASSIGNABLE_ROLES),
});

export type AdminRoleUpdateInput = z.infer<typeof adminRoleUpdateSchema>;

export const adminUserActionSchema = z
  .object({
    action: z.enum(ADMIN_USER_ACTIONS),
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required.')
      .max(2000, 'Reason must be 2,000 characters or fewer.'),
    durationDays: z.coerce
      .number()
      .int('Duration must be a whole number of days.')
      .positive('Duration must be greater than zero.')
      .max(3650, 'Duration must be 3,650 days or fewer.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'suspend' && data.durationDays === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationDays'],
        message: 'durationDays is required when suspending a user.',
      });
    }
  });

export type AdminUserActionInput = z.infer<typeof adminUserActionSchema>;

export const auditLogQuerySchema = z.object({
  actor: z.string().trim().max(100).optional(),
  action: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
