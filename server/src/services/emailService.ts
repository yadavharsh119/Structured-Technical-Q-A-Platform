import { logger } from '../middleware/requestLogger';

export type AccountActionEmailType = 'warn' | 'suspend' | 'ban' | 'restore';

export interface EmailService {
  sendVerificationEmail(to: string, link: string): Promise<void>;
  sendPasswordResetEmail(to: string, link: string): Promise<void>;
  sendAccountActionEmail(
    to: string,
    action: AccountActionEmailType,
    reason: string,
    suspendedUntil: Date | null,
  ): Promise<void>;
}

// Dev email capture (no SMTP in this ticket). The link contains a raw token,
// so it is deliberately never logged.
export class LogEmailService implements EmailService {
  async sendVerificationEmail(to: string, _link: string): Promise<void> {
    logger.info({ to }, 'Verification email queued (dev capture)');
  }

  async sendPasswordResetEmail(to: string, _link: string): Promise<void> {
    logger.info({ to }, 'Password reset email queued (dev capture)');
  }

  async sendAccountActionEmail(
    to: string,
    action: AccountActionEmailType,
    reason: string,
    suspendedUntil: Date | null,
  ): Promise<void> {
    logger.info({ to, action, reason, suspendedUntil }, 'Account action email (dev capture)');
  }
}

export const emailService: EmailService = new LogEmailService();
