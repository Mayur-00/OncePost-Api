-- AlterEnum
ALTER TYPE "PostStatus" ADD VALUE 'PUBLISHED';

-- AlterEnum
ALTER TYPE "SocialPlatforms" ADD VALUE 'NONE';

-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "scheduled_for" "SocialPlatforms"[];
