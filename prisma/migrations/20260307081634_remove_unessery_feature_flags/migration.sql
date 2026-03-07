/*
  Warnings:

  - You are about to drop the column `analyticsEnabled` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `maxSocialAccounts` on the `SubscriptionPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "analyticsEnabled",
DROP COLUMN "maxSocialAccounts";
