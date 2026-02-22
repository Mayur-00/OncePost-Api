/*
  Warnings:

  - You are about to drop the column `cancelled` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `failed` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `customBranding` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `SubscriptionPlan` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[razorpay_order_id]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "cancelled",
DROP COLUMN "failed";

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "customBranding",
ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "webhook_processed" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_razorpay_order_id_key" ON "Transaction"("razorpay_order_id");
