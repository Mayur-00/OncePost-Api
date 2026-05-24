import { Logger } from 'winston';
import { SubscriptionService } from '../../../modules/subscription/subscription.services.js';

export class SubscriptionExpirationHandler {
  constructor(
    private SubscriptionServices: SubscriptionService,
    private logger: Logger,
  ) {}

  async Handle(subscription_id: string, userId: string) {
    try {
      const currentSubscription =
        await this.SubscriptionServices.getSubcriptionById(subscription_id);

      if (!currentSubscription) {
        this.logger.warn(
          `Subscription target processing skipped: ID ${subscription_id} not found.`,
        );
        return false;
      }

      // Idempotency check: If it's already expired, do nothing
      if (currentSubscription.status === 'EXPIRED') {
        this.logger.info(`Subscription ${subscription_id} is already EXPIRED.`);
        return true;
      }

      // Check if it's too early to expire it
      // if (currentSubscription.end_date > now) {
      //   this.logger.error(`Aborting Expiration: end_date (${currentSubscription.end_date}) is in the future for ID: ${subscription_id}`);
      //   throw new Error('Subscription cannot be expired yet!');
      // }

      const expiredSubscription = await this.SubscriptionServices.expireSubscription(
        currentSubscription.id,
      );

      if (!expiredSubscription || expiredSubscription.status !== 'EXPIRED') {
        this.logger.error(
          `Prisma failed to commit EXPIRED status for subscription ID: ${subscription_id}`,
        );
        throw new Error('failed to expire subscription');
      }

      const activateFreePlan = await this.SubscriptionServices.ReactivateFreeSubscription(userId);
      if (!activateFreePlan || activateFreePlan.status !== 'ACTIVE') {
        this.logger.error(
          `Downgrade failure: Couldn't reactivate Free Plan for user ID: ${userId}`,
        );
        throw new Error('Failed To Re Activate Free Plan');
      }

      this.logger.info(`Successfully transitioned User ${userId} to Free Tier.`);
      return true;
    } catch (error) {
      this.logger.error(`Failed To Expire Subscription ${subscription_id}: ${error}`);
      throw error;
    }
  }
}
