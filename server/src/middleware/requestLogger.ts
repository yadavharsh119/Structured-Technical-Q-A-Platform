import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from '../config';

// SEC-18: never write credentials, session tokens or reset/verification links
// to logs, even when an object is logged by mistake.
const redact = {
  paths: [
    'password',
    'newPassword',
    'currentPassword',
    'confirmPassword',
    'token',
    'rawToken',
    'cookie',
    'authorization',
    'link',
    'resetLink',
    '*.password',
    '*.newPassword',
    '*.currentPassword',
    '*.confirmPassword',
    '*.token',
    '*.rawToken',
    '*.cookie',
    '*.authorization',
    '*.link',
    '*.resetLink',
    'req.headers.cookie',
    'req.headers.authorization',
  ],
  censor: '[REDACTED]',
};

export const logger = pino({
  level: config.LOG_LEVEL,
  redact,
});

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/api/health' && config.NODE_ENV === 'test',
  },
  // Do not serialise request or response headers (cookies, Authorization).
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
