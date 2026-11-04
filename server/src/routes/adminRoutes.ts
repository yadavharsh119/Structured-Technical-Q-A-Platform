import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import {
  decide,
  list,
  removePerspective,
} from '../controllers/deletionRequestController';

const router = Router();

// FR-PSP-03: administrators review author deletion requests.
router.get('/deletion-requests', requireRole('admin'), list);
router.post('/deletion-requests/:id/decision', requireRole('admin'), decide);

// FR-PSP-03: administrators may soft-delete or hard-delete any perspective.
router.delete('/perspectives/:id', requireRole('admin'), removePerspective);

export default router;
