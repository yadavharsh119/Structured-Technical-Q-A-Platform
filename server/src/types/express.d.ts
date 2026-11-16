import { UserRole, UserStatus } from './database';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string;
        user: {
          id: string;
          role: UserRole;
          status: UserStatus;
          emailVerified: boolean;
        };
      };
    }
  }
}

export {};

