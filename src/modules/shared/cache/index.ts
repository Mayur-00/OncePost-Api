import logger from '../../../config/logger.config.js';
import redis from '../../../config/redis.config.js';
import { CacheClass } from './cache.services.js';

export const cacheService = new CacheClass(logger, redis);
