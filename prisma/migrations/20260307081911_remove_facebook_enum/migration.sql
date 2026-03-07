/*
  Warnings:

  - The values [FACEBOOK] on the enum `SocialPlatforms` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SocialPlatforms_new" AS ENUM ('LINKEDIN', 'X', 'NONE');
ALTER TABLE "SocialAccount" ALTER COLUMN "platform" TYPE "SocialPlatforms_new" USING ("platform"::text::"SocialPlatforms_new");
ALTER TABLE "Post" ALTER COLUMN "scheduled_for" TYPE "SocialPlatforms_new"[] USING ("scheduled_for"::text::"SocialPlatforms_new"[]);
ALTER TABLE "PlatformPost" ALTER COLUMN "platform" TYPE "SocialPlatforms_new" USING ("platform"::text::"SocialPlatforms_new");
ALTER TABLE "OAuthSession" ALTER COLUMN "provider" TYPE "SocialPlatforms_new" USING ("provider"::text::"SocialPlatforms_new");
ALTER TABLE "PostAnalytic" ALTER COLUMN "platform" TYPE "SocialPlatforms_new" USING ("platform"::text::"SocialPlatforms_new");
ALTER TABLE "job" ALTER COLUMN "platforms" TYPE "SocialPlatforms_new"[] USING ("platforms"::text::"SocialPlatforms_new"[]);
ALTER TYPE "SocialPlatforms" RENAME TO "SocialPlatforms_old";
ALTER TYPE "SocialPlatforms_new" RENAME TO "SocialPlatforms";
DROP TYPE "public"."SocialPlatforms_old";
COMMIT;

-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';
