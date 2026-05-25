-- DropIndex
DROP INDEX "public"."Subscription_status_idx";

-- DropIndex
DROP INDEX "public"."Subscription_user_id_idx";

-- AlterTable
ALTER TABLE "OAuthSession" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 MINUTES';

-- CreateIndex
CREATE INDEX "Subscription_user_id_status_idx" ON "Subscription"("user_id", "status");
npx prisma generate