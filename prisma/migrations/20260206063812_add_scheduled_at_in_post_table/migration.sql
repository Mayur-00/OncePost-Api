-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "scheduledAt" TIMESTAMP(3);
