import { Router } from 'express';
import { requireVerified } from '../middleware/auth';
import { compare, create, list, toggleUpvote } from '../controllers/perspectiveController';

const router = Router();

// Perspectives live under their topic slug; listing and comparing are public
router.post('/topics/:slug/perspectives', requireVerified, create);
router.get('/topics/:slug/perspectives', list);
router.get('/topics/:slug/compare', compare);

// Votes
router.post('/perspectives/:id/upvote', requireVerified, toggleUpvote);

export default router;
