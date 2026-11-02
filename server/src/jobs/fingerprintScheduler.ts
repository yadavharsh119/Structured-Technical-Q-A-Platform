import cron from 'node-cron';
import { logger } from '../middleware/requestLogger';
import { fingerprintService } from '../services/fingerprintService';

// FR-EXP-01: recompute every user's top three categories once per day.
export function startFingerprintScheduler() {
  let running = false;

  return cron.schedule('0 3 * * *', async () => {
    if (running) {
      logger.warn('Expert fingerprint recalculation skipped: previous run still active');
      return;
    }

    running = true;
    try {
      const users = await fingerprintService.recalculateAllUsers();
      logger.info({ users }, 'Expert fingerprints recalculated');
    } catch (err) {
      logger.error({ err }, 'Expert fingerprint recalculation failed');
    } finally {
      running = false;
    }
  });
}
