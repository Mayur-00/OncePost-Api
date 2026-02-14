import { SubscriptionService } from "./subscription.services.js";
import prisma from '../../config/prisma.js';
import logger from '../../config/logger.config.js';
import { SubscriptionControllerClass } from "./subscription.controller.js";
import { RazorpayServices } from "../razorpay/index.js";
import { createSubscriptionRoutes } from "./subscription.router.js";

export const SubscriptionServices = new SubscriptionService(prisma, logger);

export const SubscriptionController = new SubscriptionControllerClass(SubscriptionServices, RazorpayServices, logger);

export const subscriptionRouter = createSubscriptionRoutes(SubscriptionController)

export * from './subscription.dto.js';
