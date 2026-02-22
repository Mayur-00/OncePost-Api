import { Logger } from 'winston';
import { PrismaClient, Subscription, SubscriptionPlan } from '../../generated/prisma/client.js';
import { createSubscription } from './subscription.types.js';
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

      return await this.prismaClient.subscription.create({
        data: {
          user_id: user_id,
          plan_id: plan.id,
          status: 'PENDING',
          start_date: start,
          end_date: end,
          platform_connections_remaining: plan.maxSocialAccounts,
          post_creation_remaining: plan.maxPostsPerMonth,
        },
      });
    } catch (error) {
      this.logger.error(`failed to create subscription : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async activateSubscription(subscription_id: string) {
    try {
      return await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      this.logger.error(`failed to activate subscription : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async expireSubscription(subscription_id: string) {
    try {
      return await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'EXPIRED',
        },
      });
    } catch (error) {
      this.logger.error(`failed to activate subscription : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async flagSubscriptionFailed(subscription_id: string, failure_reason: string) {
    try {
      return await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'FAILED',
          failure_reason: failure_reason,
        },
      });
    } catch (error) {
      this.logger.error(`failed to flag subscription failed : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async cancelSubscription(subscription_id: string, cancellation_reason: string) {
    try {
      return await this.prismaClient.subscription.update({
        where: {
          id: subscription_id,
        },
        data: {
          status: 'CANCELLED',
          cancellation_reason: cancellation_reason,
          cancelled_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`failed to cancel subscription  : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async getSubscription(user_id: string) {
    try {
      return await this.prismaClient.subscription.findFirst({
        where: {
          user_id: user_id,
          status: 'ACTIVE',
        },
        include: {
          plan: true,
        },
      });
    } catch (error) {
      this.logger.error(`failed to get Current subscription : ${error}`);
      throw new ApiError(500, 'intenal server error');
    }
  }

  async getAllSubscriptionPlans() {
    try {
      return await this.prismaClient.subscriptionPlan.findMany();
    } catch (error) {
      this.logger.error(`failed to get subscription plans : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  }
  async getSubscriptionPlanById(plan_id: string) {
    try {
      return await this.prismaClient.subscriptionPlan.findUnique({
        where: {
          id: plan_id,
        },
      });
    } catch (error) {
      this.logger.error(`failed to get subscription plan : ${error}`);
      throw new ApiError(500, 'internal server error');
    }
  };

  async handleSuccessfulPayment({
  transactionId,
  paymentId,
  eventId,
}: {
  transactionId: string;
  paymentId: string;
  eventId: string;
}) {
  await this.prismaClient.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) return;

    if (transaction.status === "COMPLETED") return;

    // Mark transaction completed
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: "COMPLETED",
        razorpay_payment_id: paymentId,
        webhook_processed:true
      },
    });

    // Expire old active subscriptions
    await tx.subscription.updateMany({
      where: {
        user_id: transaction.user_id,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Activate new subscription
    await tx.subscription.update({
      where: { id: transaction.subscription_id },
      data: {
        status: "ACTIVE",
        start_date: new Date(),
        end_date: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ),
      },
    });
  });
};

async handleFailedPayment(orderId: string, eventId: string) {
  await this.prismaClient.transaction.updateMany({
    where: {
      razorpay_order_id: orderId,
      status: "PENDING",
    },
    data: {
      status: "FAILED",
    },
  });
}


}
