import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.config.js';
import { ExpireSubscriptionJobBody } from '../worker.types.js';
import logger from '../../config/logger.config.js';
import { SubscriptionExpirationHandler } from './handlers/subscriptionExpiration.handler.js';
import { SubscriptionServices } from '../../modules/subscription/index.js';

export const Subscription_Worker = new Worker<ExpireSubscriptionJobBody>(
  'subscription_expire',
  async (job) => {
    try {
      const { subscriptionId, userId } = job.data;
      const subscriptionHander = new SubscriptionExpirationHandler(SubscriptionServices, logger);

      await subscriptionHander.Handle(subscriptionId, userId);

      return true;
    } catch (error) {
      logger.error(`Subscription Worker Error: ${error}`);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 1 },
);

// Worker event listeners
Subscription_Worker.on('completed', (job) => {
  logger.info(`✅ Subscription expiration job ${job.id} completed successfully`);
});

Subscription_Worker.on('failed', (job, err) => {
  logger.error(`❌ Subscription expiration job ${job?.id} failed:`, err);
});

Subscription_Worker.on('error', (err) => {
  logger.error('Subscription Worker process error:', err);
});

// Keep worker alive when run as standalone process
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('🚀 publish Post Worker started on separate process');
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing subscription worker...');
    await Subscription_Worker.close();
    process.exit(0);
  });
}
