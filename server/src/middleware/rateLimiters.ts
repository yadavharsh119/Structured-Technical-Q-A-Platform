import { rateLimit } from 'express-rate-limit';
import { config } from '../config';

// 20 auth requests per IP per 15 minutes (FR-AUTH-06 / rate limit)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  validate: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    });
  },
});
