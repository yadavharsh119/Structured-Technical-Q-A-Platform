import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiters';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login', authLimiter, login);
router.post('/logout', requireAuth, logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);

export default router;
