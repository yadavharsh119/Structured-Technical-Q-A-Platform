import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import {
  archive,
  create,
  getBySlug,
  list,
  merge,
  update,
} from '../controllers/topicController';

const router = Router();

// Public, published topics only (FR-TOP-01)
router.get('/', list);

// Moderator/admin topic administration (FR-TOP-01, FR-TOP-02, FR-TOP-04)
router.post('/', requireRole('moderator'), create);
router.patch('/:id', requireRole('moderator'), update);
router.post('/:id/archive', requireRole('moderator'), archive);

// FR-TOP-03 alias for the documented topic-merge path; admin-only either way.
router.post('/merge', requireRole('admin'), merge);

// Public topic lookup, including archived topics and old-slug redirects
router.get('/:slug', getBySlug);

export default router;
