/*
  Warnings:

  - You are about to drop the column `current_period_end` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `current_period_start` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `plan_tier_id` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_subscription_id` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `end_date` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan_id` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_connections_remaining` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `post_creation_remaining` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'FAILED';

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_plan_tier_id_fkey";

-- DropIndex
DROP INDEX "SubscriptionPlan_plan_tier_key";

-- DropIndex
DROP INDEX "Transaction_razorpay_order_id_key";

-- DropIndex
DROP INDEX "Transaction_razorpay_payment_id_key";

-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "current_period_end",
DROP COLUMN "current_period_start",
DROP COLUMN "plan_tier_id",
DROP COLUMN "razorpay_subscription_id",
ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled" BOOLEAN,
ADD COLUMN     "end_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "failed" BOOLEAN,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "plan_id" TEXT NOT NULL,
ADD COLUMN     "platform_connections_remaining" INTEGER NOT NULL,
ADD COLUMN     "post_creation_remaining" INTEGER NOT NULL,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "description",
ALTER COLUMN "razorpay_payment_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
