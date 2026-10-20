import crypto from 'crypto';

/** Raw token for URLs/emails: 32 random bytes, base64url encoded (43 chars). */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** Only the sha256 hash of a token is ever stored in the database. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
