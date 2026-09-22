import { Router } from 'express';
import healthRoutes from './healthRoutes';

const router = Router();

// Mount health routes at /health
router.use('/health', healthRoutes);

export default router;
