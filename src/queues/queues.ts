import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.config.js';

export const postQueue = new Queue('post', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 50,
  },
});
export const subscriptionExpirationQueue = new Queue('subscription_expire', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 50,
  },
});
