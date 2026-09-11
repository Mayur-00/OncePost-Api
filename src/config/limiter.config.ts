import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from './redis.config.js';
import { ApiError } from '../utils/apiError.js';

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,

  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:',
  }),

  handler: (req, res, next, options) => {
    throw new ApiError(options.statusCode, "You've exceeded the request limit. Slow down!");
  },
});
