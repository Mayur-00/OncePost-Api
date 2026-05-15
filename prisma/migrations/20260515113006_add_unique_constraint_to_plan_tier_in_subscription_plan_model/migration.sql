/*
  Warnings:

  - A unique constraint covering the columns `[plan_tier]` on the table `SubscriptionPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_plan_tier_key" ON "SubscriptionPlan"("plan_tier");
