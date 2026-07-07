import http from 'node:http';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import env from './config/env.js';
import logger from './utils/logger.js';

const server = http.createServer(app);
let isShuttingDown = false;

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info(`Database connection established`);
    server.listen(env.port, () => logger.info(`CivicConnect API listening on port ${env.port} (${env.nodeEnv})`));
  } catch (error) {
    logger.error('Failed to start the server', { message: error.message, stack: error.stack });
    process.exit(1);
  }
};

const shutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn(`${signal} received. Shutting down gracefully...`);
  const timer = setTimeout(() => process.exit(1), env.shutdownTimeoutMs);
  timer.unref();
  server.close(async (error) => {
    if (error) return process.exit(1);
    try {
      await disconnectDatabase();
      logger.info('Database disconnected successfully');
      clearTimeout(timer);
      process.exit(0);
    } catch (databaseError) {
      logger.error('Database shutdown failed', { message: databaseError.message, stack: databaseError.stack });
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

startServer();
