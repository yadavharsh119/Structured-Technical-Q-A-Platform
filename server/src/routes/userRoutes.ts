import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getFingerprint,
  updateFingerprintVisibility,
} from '../controllers/fingerprintController';
import {
  changeMyPassword,
  getProfile,
  updateMyProfile,
} from '../controllers/userController';

const router = Router();

// FR-PROF-01/02: edit the signed-in user's own profile and privacy settings.
router.patch('/me', requireAuth, updateMyProfile);

// FR-PROF-01: change the signed-in user's password and revoke other sessions.
router.post('/me/change-password', requireAuth, changeMyPassword);

// FR-EXP-02: owner toggles whether their fingerprint is public.
router.patch('/me/fingerprint-visibility', requireAuth, updateFingerprintVisibility);

// FR-EXP-01: public expert fingerprint, subject to the user's visibility setting.
router.get('/:id/fingerprint', getFingerprint);

// FR-PROF-01: public profile with privacy-aware email and contribution stats.
router.get('/:id', getProfile);

export default router;
