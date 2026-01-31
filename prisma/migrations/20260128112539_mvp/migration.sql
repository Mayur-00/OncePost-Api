-- CreateEnum
CREATE TYPE "AuthProviderType" AS ENUM ('GOOGLE', 'CREDENTIAL');

-- CreateEnum
CREATE TYPE "SocialPlatforms" AS ENUM ('LINKEDIN', 'X', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('CREATED', 'SCHEDULED', 'UPLOADED', 'PENDING', 'DARFT', 'FAILED');

-- CreateEnum
CREATE TYPE "Provieder" AS ENUM ('X', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "PlatfromPostStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "provider_id" TEXT,
    "provider" "AuthProviderType" NOT NULL,
    "profile_picture" TEXT,
    "refresh_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "platform" "SocialPlatforms" NOT NULL,
    "platform_userid" TEXT NOT NULL,
    "username" TEXT,
    "display_name" TEXT,
    "profile_picture" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3) NOT NULL,
    "platformData" JSONB DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "status" "PostStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPost" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "platform" "SocialPlatforms" NOT NULL,
    "platform_post_id" TEXT,
    "platform_post_url" TEXT,
    "error" TEXT,
    "status" "PlatfromPostStatus" NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthSession" (
    "id" TEXT NOT NULL,
    "ownerid" TEXT NOT NULL,
    "provider" "SocialPlatforms" NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '10 MINUTES',

    CONSTRAINT "OAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytic" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "platform_post_id" TEXT NOT NULL,
    "platform" "SocialPlatforms" NOT NULL,
    "likes" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "reach" DOUBLE PRECISION NOT NULL,
    "views" INTEGER NOT NULL,
    "members_added" INTEGER NOT NULL,
    "reshares" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAnalytic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SocialAccount_owner_id_idx" ON "SocialAccount"("owner_id");

-- CreateIndex
CREATE INDEX "SocialAccount_platform_idx" ON "SocialAccount"("platform");

-- CreateIndex
CREATE INDEX "Post_owner_id_status_idx" ON "Post"("owner_id", "status");

-- CreateIndex
CREATE INDEX "PlatformPost_post_id_idx" ON "PlatformPost"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthSession_state_key" ON "OAuthSession"("state");

-- CreateIndex
CREATE INDEX "OAuthSession_ownerid_idx" ON "OAuthSession"("ownerid");

-- CreateIndex
CREATE INDEX "OAuthSession_state_idx" ON "OAuthSession"("state");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPost" ADD CONSTRAINT "PlatformPost_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPost" ADD CONSTRAINT "PlatformPost_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPost" ADD CONSTRAINT "PlatformPost_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthSession" ADD CONSTRAINT "OAuthSession_ownerid_fkey" FOREIGN KEY ("ownerid") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytic" ADD CONSTRAINT "PostAnalytic_platform_post_id_fkey" FOREIGN KEY ("platform_post_id") REFERENCES "PlatformPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytic" ADD CONSTRAINT "PostAnalytic_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
