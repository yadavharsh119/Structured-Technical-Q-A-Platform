import { Router } from 'express';
import { requireRole, requireVerified } from '../middleware/auth';
import { action, create, list } from '../controllers/reportController';

const router = Router();

// FR-MOD-01: verified users report a topic or perspective
router.post('/', requireVerified, create);

// FR-MOD-02: moderator/admin queue and actions
router.get('/', requireRole('moderator'), list);
router.post('/:id/action', requireRole('moderator'), action);

export default router;
