import { Router } from 'express';
import { requireAuth, requireVerified } from '../middleware/auth';
import { compare, create, list, toggleUpvote } from '../controllers/perspectiveController';
import { create as createDeletionRequest } from '../controllers/deletionRequestController';

const router = Router();

// Perspectives live under their topic slug; listing and comparing are public
router.post('/topics/:slug/perspectives', requireVerified, create);
router.get('/topics/:slug/perspectives', list);
router.get('/topics/:slug/compare', compare);

// Votes
router.post('/perspectives/:id/upvote', requireVerified, toggleUpvote);

// FR-PSP-03: the author asks an administrator to delete their perspective.
router.post('/perspectives/:id/deletion-requests', requireAuth, createDeletionRequest);

export default router;
