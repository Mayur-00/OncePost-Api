import dotenv from 'dotenv';
import logger from '../../config/logger.config.js';
import connectDb from '../../lib/db.js';
import { postWorker } from './worker.js';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

async function startWorker() {
  await connectDb();
  logger.info('🚀 Starting LinkedIn Post Worker...');
}

startWorker();

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down worker...');
  await postWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down worker...');
  await postWorker.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
