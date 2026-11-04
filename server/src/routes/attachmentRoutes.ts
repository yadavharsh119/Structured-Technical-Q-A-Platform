import { Router } from 'express';
import { create, download, uploadSingleFile } from '../controllers/attachmentController';
import { requireVerified } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiters';

const router = Router();

// SEC-09: uploads are authenticated, verified and rate limited.
router.post('/', requireVerified, uploadLimiter, uploadSingleFile, create);

// Access control is enforced in the service because approved questions and
// visible perspectives are publicly downloadable.
router.get('/:id/download', download);

export default router;
