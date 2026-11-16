import { Router } from 'express';
import { search } from '../controllers/searchController';

const router = Router();

// GET /api/search — public, no auth required (FR-SRCH-01, FR-SRCH-02)
router.get('/', search);

export default router;
