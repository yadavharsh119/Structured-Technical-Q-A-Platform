import { rateLimit } from 'express-rate-limit';
import { config } from '../config';

// Tests opt in with RATE_LIMIT_ENABLED=true when they exercise limiting.
const skipInTest = (): boolean =>
  config.NODE_ENV === 'test' && process.env.RATE_LIMIT_ENABLED !== 'true';

// 20 auth requests per IP per 15 minutes (FR-AUTH-06 / rate limit)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  validate: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
    });
  },
});

// Authenticated content creation (questions, perspectives and reports).
export const contentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  validate: false,
  keyGenerator: (req) => req.auth?.user.id ?? req.ip ?? 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many submissions. Please try again later.' },
    });
  },
});

// SEC-09: cap attachment uploads per user.
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  validate: false,
  keyGenerator: (req) => req.auth?.user.id ?? req.ip ?? 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attachment uploads. Please try again later.',
      },
    });
  },
});

// FR-PROF-03: at most 3 account exports per user per hour.
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  validate: false,
  keyGenerator: (req) => req.auth?.user.id ?? req.ip ?? 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many export requests. Please try again later.' },
    });
  },
});
