import { Logger } from 'winston';
import { redisClientType } from '../../../config/redis.config.js';

export class CacheClass {
  constructor(
    private logger: Logger,
    private redis: redisClientType,
  ) {}

  async getOrSet(key, ttlSeconds, fetchFn) {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const freshData = await fetchFn();
      if (freshData !== undefined && freshData !== null) {
        await this.redis.set(key, JSON.stringify(freshData), 'EX', ttlSeconds);
      }
      return freshData;
    } catch (error) {
      this.logger.error(`Cache error on key [${key}]:`, error);
      // Fallback to source function directly if Redis fails
      return await fetchFn();
    }
  }

  async getCache(key: string): Promise<{ success: boolean; data: unknown }> {
    try {
      const cache = await this.redis.get(key);
      if (!cache) {
        this.logger.info(`there is no cache on this key: ${key}`);
        return { success: false, data: null };
      }
      const data = JSON.parse(cache);

      return { success: true, data: data };
    } catch (error) {
      this.logger.error(`failed to get cache by this key : ${key}`);
      return { success: false, data: null };
    }
  }

  async setCache(key: string, freshData: unknown): Promise<{ success: boolean; message: string }> {
    try {
      if (freshData == null) {
        this.logger.error('Provided data is null');
        return { success: false, message: 'Provided data is null' };
      }

      const data = JSON.stringify(freshData);
      await this.redis.set(key, data, 'EX', 3600);

      return { success: true, message: 'success' };
    } catch (error) {
      this.logger.error(`failed to set cache by this key : ${key}`);
      return { success: false, message: 'Internal Server Error' };
    }
  }
}
