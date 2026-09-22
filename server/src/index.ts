import { app } from './app';
import { config } from './config';
import { logger } from './middleware/requestLogger';
import { closeDatabaseConnection } from './config/database';

const server = app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
  logger.info(`Health check available at http://localhost:${config.PORT}/api/health`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await closeDatabaseConnection();
      logger.info('Database connections closed.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database teardown');
      process.exit(1);
    }
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
