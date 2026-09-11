import logger from '../../../config/logger.config.js';
import redis from '../../../config/redis.config.js';
import { CacheClass } from './cache.services.js';

export const CacheAdapter = new CacheClass(logger, redis);
