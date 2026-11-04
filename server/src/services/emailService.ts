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

// Dev email capture (no SMTP in this ticket): logs the link at info level.
export class LogEmailService implements EmailService {
  async sendVerificationEmail(to: string, link: string): Promise<void> {
    logger.info({ to, link }, 'Verification email (dev capture)');
  }

  async sendPasswordResetEmail(to: string, link: string): Promise<void> {
    logger.info({ to, link }, 'Password reset email (dev capture)');
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
