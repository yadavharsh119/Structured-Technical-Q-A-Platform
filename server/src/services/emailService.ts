import { logger } from '../middleware/requestLogger';

export interface EmailService {
  sendVerificationEmail(to: string, link: string): Promise<void>;
  sendPasswordResetEmail(to: string, link: string): Promise<void>;
}

// Dev email capture (no SMTP in this ticket): logs the link at info level.
export class LogEmailService implements EmailService {
  async sendVerificationEmail(to: string, link: string): Promise<void> {
    logger.info({ to, link }, 'Verification email (dev capture)');
  }

  async sendPasswordResetEmail(to: string, link: string): Promise<void> {
    logger.info({ to, link }, 'Password reset email (dev capture)');
  }
}

export const emailService: EmailService = new LogEmailService();
