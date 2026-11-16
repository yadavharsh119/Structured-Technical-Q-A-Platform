import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  // Comma-separated allowlist of trusted browser origins (COM-03).
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z
    .string()
    .default('postgres://postgres:postgrespassword@localhost:5432/structured_qa'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgrespassword'),
  DB_NAME: z.string().default('structured_qa'),
  SESSION_SECRET: z.string().default('dev_session_secret_change_in_production_32chars_min'),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  // Directory for uploaded files. Must stay outside any web root.
  UPLOAD_DIR: z.string().default('uploads'),
  // Secure cookies are mandatory in production; in local development they are
  // opt-in so the app keeps working over plain HTTP.
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => {
      if (process.env.NODE_ENV === 'production') return true;
      if (value !== undefined) return value === 'true';
      return false;
    }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
