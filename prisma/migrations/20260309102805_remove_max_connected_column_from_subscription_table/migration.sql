/*
  Warnings:

  - You are about to drop the column `platform_connections_remaining` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "platform_connections_remaining";
