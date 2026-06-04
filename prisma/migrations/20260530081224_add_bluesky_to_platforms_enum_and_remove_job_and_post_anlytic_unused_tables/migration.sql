/*
  Warnings:

  - You are about to drop the `PostAnalytic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "Provieder" ADD VALUE 'BLUESKY';

-- AlterEnum
ALTER TYPE "SocialPlatforms" ADD VALUE 'BLUESKY';

-- DropForeignKey
ALTER TABLE "public"."PostAnalytic" DROP CONSTRAINT "PostAnalytic_account_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PostAnalytic" DROP CONSTRAINT "PostAnalytic_platform_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."job" DROP CONSTRAINT "job_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."job" DROP CONSTRAINT "job_related_post_id_fkey";

-- DropIndex
DROP INDEX "public"."SocialAccount_owner_id_idx";

-- DropIndex
DROP INDEX "public"."SocialAccount_platform_idx";

-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- DropTable
DROP TABLE "public"."PostAnalytic";

-- DropTable
DROP TABLE "public"."job";

-- CreateIndex
CREATE INDEX "SocialAccount_owner_id_platform_idx" ON "SocialAccount"("owner_id", "platform");
