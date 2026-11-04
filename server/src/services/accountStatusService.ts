import { AppError } from '../middleware/errorHandler';
import { userRepository } from '../repositories/userRepository';

/**
 * FR-MOD-03: one shared server-side check for all contribution write paths
 * (question submission, perspectives, reports and votes).
 *
 * Suspensions expire by clock comparison, so an elapsed suspension is cleared
 * lazily here and the request is allowed through. Existing sessions are not
 * revoked when a user is suspended or banned; the check is re-run on every
 * protected action instead.
 */
export async function assertCanContribute(userId: string): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  if (user.status === 'banned') {
    throw new AppError(
      'Your account is banned. You cannot submit content or vote.',
      403,
      'ACCOUNT_BANNED',
    );
  }

  if (user.status === 'suspended') {
    const now = new Date();
    if (user.suspended_until && user.suspended_until.getTime() <= now.getTime()) {
      await userRepository.clearExpiredSuspension(user.id, now);
      return;
    }
    throw new AppError(
      'Your account is suspended. You cannot submit content or vote until the suspension ends.',
      403,
      'ACCOUNT_SUSPENDED',
    );
  }
}
