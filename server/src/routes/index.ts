import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import questionRoutes from './questionRoutes';
import topicRoutes from './topicRoutes';
import perspectiveRoutes from './perspectiveRoutes';
import { categoryRoutes, tagRoutes } from './taxonomyRoutes';
import searchRoutes from './searchRoutes';
import reportRoutes from './reportRoutes';

const router = Router();

// Mount health routes at /health
router.use('/health', healthRoutes);

// Mount auth routes at /api/auth
router.use('/auth', authRoutes);

// Mount taxonomy routes at /api/categories and /api/tags
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);

// Mount question routes at /api/questions
router.use('/questions', questionRoutes);

// Mount topic routes at /api/topics
router.use('/topics', topicRoutes);

// Mount perspective and vote routes (full paths, mounted at /api)
router.use(perspectiveRoutes);

// Mount search route at /api/search (FR-SRCH-01, FR-SRCH-02)
router.use('/search', searchRoutes);

// Mount reports and the moderator queue at /api/reports (FR-MOD-01, FR-MOD-02)
router.use('/reports', reportRoutes);

export default router;
