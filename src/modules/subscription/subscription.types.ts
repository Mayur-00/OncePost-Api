import { SubscriptionStatus } from '../../generated/prisma/client.js';

export interface createSubscription {
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: Date;
  end_date: Date;
}
