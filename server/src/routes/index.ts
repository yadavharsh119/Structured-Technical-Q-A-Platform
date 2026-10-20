import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';

const router = Router();

// Mount health routes at /health
router.use('/health', healthRoutes);

// Mount auth routes at /api/auth
router.use('/auth', authRoutes);

export default router;
