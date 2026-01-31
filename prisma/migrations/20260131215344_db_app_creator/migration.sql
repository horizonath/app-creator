-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('COMIC', 'NOVEL');

-- CreateEnum
CREATE TYPE "UnlockType" AS ENUM ('FREE', 'CREDIT', 'MEMBERSHIP_ONLY');

-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ScoreRole" AS ENUM ('READER', 'CREATOR');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('FAUCET_CLAIM', 'UNLOCK_EPISODE', 'TIP_SENT', 'TIP_RECEIVED', 'ADMIN_ADJUST', 'MEMBERSHIP_BONUS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "username" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "creditsBalance" INTEGER NOT NULL DEFAULT 0,
    "creatorCredits" INTEGER NOT NULL DEFAULT 0,
    "lastFaucetClaimAt" TIMESTAMP(3),
    "membershipPlan" "MembershipPlan" NOT NULL DEFAULT 'FREE',
    "membershipActiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "genre" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "unlockType" "UnlockType" NOT NULL DEFAULT 'FREE',
    "unlockDurationHours" INTEGER NOT NULL DEFAULT 24,
    "novelBody" TEXT,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodePage" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "EpisodePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "EpisodeUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "episodeId" TEXT,
    "seriesId" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditsLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyUserScore" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ScoreRole" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyUserScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Series_ownerId_idx" ON "Series"("ownerId");

-- CreateIndex
CREATE INDEX "Series_type_idx" ON "Series"("type");

-- CreateIndex
CREATE INDEX "Episode_seriesId_idx" ON "Episode"("seriesId");

-- CreateIndex
CREATE INDEX "Episode_publishedAt_idx" ON "Episode"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seriesId_number_key" ON "Episode"("seriesId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodePage_episodeId_pageIndex_key" ON "EpisodePage"("episodeId", "pageIndex");

-- CreateIndex
CREATE INDEX "EpisodeView_episodeId_createdAt_idx" ON "EpisodeView"("episodeId", "createdAt");

-- CreateIndex
CREATE INDEX "EpisodeView_userId_createdAt_idx" ON "EpisodeView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EpisodeLike_episodeId_createdAt_idx" ON "EpisodeLike"("episodeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeLike_userId_episodeId_key" ON "EpisodeLike"("userId", "episodeId");

-- CreateIndex
CREATE INDEX "Comment_episodeId_createdAt_idx" ON "Comment"("episodeId", "createdAt");

-- CreateIndex
CREATE INDEX "EpisodeUnlock_episodeId_idx" ON "EpisodeUnlock"("episodeId");

-- CreateIndex
CREATE INDEX "EpisodeUnlock_userId_expiresAt_idx" ON "EpisodeUnlock"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeUnlock_userId_episodeId_key" ON "EpisodeUnlock"("userId", "episodeId");

-- CreateIndex
CREATE INDEX "Tip_toUserId_createdAt_idx" ON "Tip"("toUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Tip_fromUserId_createdAt_idx" ON "Tip"("fromUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditsLedger_userId_createdAt_idx" ON "CreditsLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditsLedger_reason_createdAt_idx" ON "CreditsLedger"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "XpLedger_userId_createdAt_idx" ON "XpLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyUserScore_role_date_idx" ON "DailyUserScore"("role", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUserScore_date_userId_role_key" ON "DailyUserScore"("date", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodePage" ADD CONSTRAINT "EpisodePage_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeView" ADD CONSTRAINT "EpisodeView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeView" ADD CONSTRAINT "EpisodeView_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeLike" ADD CONSTRAINT "EpisodeLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeLike" ADD CONSTRAINT "EpisodeLike_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeUnlock" ADD CONSTRAINT "EpisodeUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeUnlock" ADD CONSTRAINT "EpisodeUnlock_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditsLedger" ADD CONSTRAINT "CreditsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyUserScore" ADD CONSTRAINT "DailyUserScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
