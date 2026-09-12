import { SubscriptionService } from './subscription.services.js';
import prisma from '../../config/prisma.js';
import logger from '../../config/logger.config.js';
import { SubscriptionControllerClass } from './subscription.controller.js';
import { RazorpayServices } from '../razorpay/index.js';
import { createSubscriptionRoutes } from './subscription.router.js';
import { cacheService } from '../shared/cache/index.js';

export const SubscriptionServices = new SubscriptionService(prisma, logger, cacheService);

export const SubscriptionController = new SubscriptionControllerClass(
  SubscriptionServices,
  RazorpayServices,
  logger,
);

export const subscriptionRoutes = createSubscriptionRoutes(SubscriptionController);

export * from './subscription.dto.js';
