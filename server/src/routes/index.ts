import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import questionRoutes from './questionRoutes';
import topicRoutes from './topicRoutes';
import perspectiveRoutes from './perspectiveRoutes';
import { categoryRoutes, tagRoutes } from './taxonomyRoutes';

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

export default router;
