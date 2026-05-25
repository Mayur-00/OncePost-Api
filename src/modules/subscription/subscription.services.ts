import { Logger } from 'winston';
import { PrismaClient, SubscriptionPlan } from '../../generated/prisma/client.js';

import { ApiError } from '../../utils/apiError.js';
export class SubscriptionService {
  constructor(
    private prismaClient: PrismaClient,
    private logger: Logger,
  ) {}

  async createSubscription(user_id: string, plan: SubscriptionPlan) {
    try {
      const start = new Date();
      const end = new Date(start.setMonth(start.getMonth() + 1));

      const subscription = await this.prismaClient.subscription.create({
        data: {
          user_id: user_id,
          plan_id: plan.id,
          status: 'PENDING',
          start_date: start,
          end_date: end,
          post_creation_remaining: plan.maxPostsPerMonth,
        },
      });
      this.logger.info('Subscription created', {
        userId: user_id,
        subscriptionId: subscription.id,
        planId: plan.id,
      });
      return subscription;
    } catch (error) {
      this.logger.error(`failed to create subscription : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async activateSubscription(subscription_id: string) {
    try {
      const subscription = await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'ACTIVE',
        },
      });
      this.logger.info('Subscription activated', {
        subscriptionId: subscription_id,
        userId: subscription.user_id,
      });
      return subscription;
    } catch (error) {
      this.logger.error(`failed to activate subscription : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async expireSubscription(subscription_id: string) {
    try {
      const subscription = await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'EXPIRED',
        },
      });
      this.logger.info('Subscription expired', {
        subscriptionId: subscription_id,
        userId: subscription.user_id,
      });
      return subscription;
    } catch (error) {
      this.logger.error(`failed to activate subscription : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async flagSubscriptionFailed(subscription_id: string, failure_reason: string) {
    try {
      const subscription = await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'FAILED',
          failure_reason: failure_reason,
        },
      });
      this.logger.info('Subscription flagged as failed', {
        subscriptionId: subscription_id,
        reason: failure_reason,
      });
      return subscription;
    } catch (error) {
      this.logger.error(`failed to flag subscription failed : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async cancelSubscription(subscription_id: string, cancellation_reason: string) {
    try {
      const subscription = await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'CANCELLED',
          cancellation_reason: cancellation_reason,
          cancelled_at: new Date(),
        },
      });
      this.logger.info('Subscription cancelled', {
        subscriptionId: subscription_id,
        reason: cancellation_reason,
      });
      return subscription;
    } catch (error) {
      this.logger.error(`failed to cancel subscription  : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async getSubscription(user_id: string) {
    try {
      const subscription = await this.prismaClient.subscription.findFirst({
        where: {
          user_id: user_id,
          status: 'ACTIVE',
        },
        include: {
          plan: {
            select: {
              id: true,
              plan_tier: true,
              price: true,
              description: true,
              maxPostsPerMonth: true,
            },
          },
        },
      });
      this.logger.info('Active subscription retrieved', { userId: user_id, found: !!subscription });
      return subscription;
    } catch (error) {
      this.logger.error(`failed to get Current subscription : ${error}`);
      throw new ApiError(500, 'intenal server error');
    }
  }
  async getAllSubscriptionPlans() {
    try {
      const plans = await this.prismaClient.subscriptionPlan.findMany();
      this.logger.info('All subscription plans retrieved', { count: plans.length });
      return plans;
    } catch (error) {
      this.logger.error(`failed to get subscription plans : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async getSubscriptionPlanById(plan_id: string) {
    try {
      const plan = await this.prismaClient.subscriptionPlan.findUnique({
        where: {
          id: plan_id,
        },
      });
      this.logger.info('Subscription plan retrieved by ID', { planId: plan_id, found: !!plan });
      return plan;
    } catch (error) {
      this.logger.error(`failed to get subscription plan : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }

  async handleSuccessfulPayment({
    transactionId,
    paymentId,
  }: {
    transactionId: string;
    paymentId: string;
  }) {
    try {
      return await this.prismaClient.$transaction(async (tx) => {
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId },
        });

        if (!transaction) {
          this.logger.warn('Transaction not found for payment', { transactionId: transactionId });
          return;
        }

        if (transaction.status === 'COMPLETED') {
          this.logger.info('Transaction already completed', { transactionId: transactionId });
          return;
        }

        // Mark transaction completed
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            razorpay_payment_id: paymentId,
            webhook_processed: true,
          },
        });

        // Expire old active subscriptions
        await tx.subscription.updateMany({
          where: {
            user_id: transaction.user_id,
            status: 'ACTIVE',
          },
          data: {
            status: 'EXPIRED',
          },
        });

        // Activate new subscription
        const subs = await tx.subscription.update({
          where: { id: transaction.subscription_id },
          data: {
            status: 'ACTIVE',
            start_date: new Date(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        this.logger.info('Successful payment processed and subscription activated', {
          transactionId: transactionId,
          userId: transaction.user_id,
        });

        return subs;
      });
    } catch (error) {
      this.logger.error(`Failed to Handle Successfull payment, error: ${error}`);
      throw new ApiError(500, 'Internal Server Error');
    }
  }

  async handleFailedPayment(orderId: string, eventId: string) {
    try {
      await this.prismaClient.transaction.updateMany({
        where: {
          razorpay_order_id: orderId,
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
        },
      });
      this.logger.info('Failed payment processed', { orderId: orderId, eventId: eventId });
    } catch (error) {
      this.logger.error('Error processing failed payment', { orderId: orderId, error: error });
      throw error;
    }
  }
  async getSubcriptionById(subscription_id: string) {
    try {
      return await this.prismaClient.subscription.findUnique({
        where: {
          id: subscription_id,
        },
      });
    } catch (error) {
      this.logger.error(`Failed To get Subscription by id: ${subscription_id}`);
      throw error;
    }
  }

  async ReactivateFreeSubscription(userId: string) {
    try {
      const freePlan = await this.prismaClient.subscriptionPlan.findUnique({
        where: { plan_tier: 'FREE' },
        select: { id: true, maxPostsPerMonth: true },
      });

      if (!freePlan) {
        this.logger.error('Database initialization error: Free Plan configuration not found');
        throw new Error('Free Plan Not Found');
      }

      // Look for any existing free tier subscription records
      const existingSubscription = await this.prismaClient.subscription.findFirst({
        where: {
          user_id: userId,
          plan_id: freePlan.id,
        },
        select: { id: true },
      });

      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 10); // Free tiers valid for 10 years

      if (existingSubscription) {
        return await this.prismaClient.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: 'ACTIVE',
            start_date: new Date(),
            end_date: farFutureDate,
          },
        });
      } else {
        // Fallback safety if the user never had a free subscription record
        return await this.prismaClient.subscription.create({
          data: {
            user_id: userId,
            plan_id: freePlan.id,
            status: 'ACTIVE',
            start_date: new Date(),
            end_date: farFutureDate,
            post_creation_remaining: freePlan.maxPostsPerMonth ?? 10,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to ReActivate User Free Subscription`);
      throw error;
    }
  }
}
