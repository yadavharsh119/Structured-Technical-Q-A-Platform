import { Router } from 'express';
import { getBySlug, list } from '../controllers/topicController';

const router = Router();

// Public, published topics only (FR-TOP-01)
router.get('/', list);
router.get('/:slug', getBySlug);

export default router;
