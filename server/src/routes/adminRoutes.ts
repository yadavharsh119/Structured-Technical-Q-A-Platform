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
import { merge as mergeTopics } from '../controllers/topicController';
import {
  createCategory,
  createTag,
  listAdminCategories,
  listAdminTags,
  mergeTags,
  updateCategory,
  updateTag,
} from '../controllers/taxonomyController';

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

// FR-TOP-03: topic merge is explicitly admin-only (moderators get 403).
router.post('/topics/merge', requireRole('admin'), mergeTopics);

// FR-TOP-05, FR-TOP-06: moderators and admins manage categories and tags.
router.get('/categories', requireRole('moderator'), listAdminCategories);
router.post('/categories', requireRole('moderator'), createCategory);
router.patch('/categories/:id', requireRole('moderator'), updateCategory);

router.get('/tags', requireRole('moderator'), listAdminTags);
router.post('/tags', requireRole('moderator'), createTag);
router.post('/tags/merge', requireRole('moderator'), mergeTags);
router.patch('/tags/:id', requireRole('moderator'), updateTag);

export default router;
