import prisma from '../../config/prisma.js';
import logger from '../../config/logger.config.js';
import { AnalyticsService } from './analytics.services.js';
import { AnalyticsController } from './analytics.controller.js';
import { createAnalyticsRoutes } from './analytics.router.js';
import { cacheService } from '../shared/cache/index.js';

const analyticsService = new AnalyticsService(prisma, logger, cacheService);
const analyticsController = new AnalyticsController(analyticsService, logger);
export const analyticsRoutes = createAnalyticsRoutes(analyticsController);
