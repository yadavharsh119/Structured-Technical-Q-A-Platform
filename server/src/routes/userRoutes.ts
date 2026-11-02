import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getFingerprint,
  updateFingerprintVisibility,
} from '../controllers/fingerprintController';

const router = Router();

// FR-EXP-01: public expert fingerprint, subject to the user's visibility setting.
router.get('/:id/fingerprint', getFingerprint);

// FR-EXP-02: owner toggles whether their fingerprint is public.
router.patch('/me/fingerprint-visibility', requireAuth, updateFingerprintVisibility);

export default router;
