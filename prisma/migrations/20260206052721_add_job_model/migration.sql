-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('PUBLISH_POST', 'SCHEDULE_POST');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('COMPLETED', 'FAILED');

-- DropIndex
DROP INDEX "PlatformPost_post_id_idx";

-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- AlterTable
ALTER TABLE "PlatformPost" ADD COLUMN     "failedAt" TIMESTAMP(3),
ALTER COLUMN "postedAt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL,
    "related_post_id" TEXT NOT NULL,
    "platforms" "SocialPlatforms"[],
    "status" "JobStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_owner_id_job_type_status_idx" ON "job"("owner_id", "job_type", "status");

-- CreateIndex
CREATE INDEX "PlatformPost_post_id_platform_idx" ON "PlatformPost"("post_id", "platform");

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_related_post_id_fkey" FOREIGN KEY ("related_post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
