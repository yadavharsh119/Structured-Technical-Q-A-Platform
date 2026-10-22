import { Router } from 'express';
import {
  approve,
  create,
  listPending,
  listMine,
  reject,
  remove,
  update,
} from '../controllers/questionController';
import { requireAuth, requireRole, requireVerified } from '../middleware/auth';

const router = Router();

router.post('/', requireVerified, create);
router.get('/mine', requireAuth, listMine);
router.get('/pending', requireAuth, requireRole('moderator'), listPending);
router.patch('/:id', requireAuth, update);
router.delete('/:id', requireAuth, remove);
router.post('/:id/reject', requireAuth, requireRole('moderator'), reject);
router.post('/:id/approve', requireAuth, requireRole('moderator'), approve);

export default router;
