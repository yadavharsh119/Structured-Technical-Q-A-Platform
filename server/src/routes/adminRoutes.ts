import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import {
  decide,
  list,
  removePerspective,
} from '../controllers/deletionRequestController';
import {
  applyUserAction,
  changeRole,
  listAuditLogs,
  listUsers,
} from '../controllers/adminController';

const router = Router();

// FR-MOD-03, FR-ADM-01: admin-only user management.
router.get('/users', requireRole('admin'), listUsers);
router.patch('/users/:id/role', requireRole('admin'), changeRole);
router.post('/users/:id/actions', requireRole('admin'), applyUserAction);

// FR-ADM-03: read-only audit log viewer (no edit or delete endpoints).
router.get('/audit-logs', requireRole('admin'), listAuditLogs);

// FR-PSP-03: administrators review author deletion requests.
router.get('/deletion-requests', requireRole('admin'), list);
router.post('/deletion-requests/:id/decision', requireRole('admin'), decide);

// FR-PSP-03: administrators may soft-delete or hard-delete any perspective.
router.delete('/perspectives/:id', requireRole('admin'), removePerspective);

export default router;
