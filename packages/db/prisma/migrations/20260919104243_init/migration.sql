-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('MONTHLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('TRIALING', 'ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED');

-- CreateEnum
CREATE TYPE "IssueKind" AS ENUM ('WELCOME', 'BROADCAST');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('OPEN', 'CLICK', 'BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('HARD_BOUNCE', 'COMPLAINT', 'MANUAL');

-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('CALM', 'DIRECT', 'STRATEGIC', 'ENCOURAGING', 'NO_NONSENSE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('OPEN', 'KEPT', 'MISSED');

-- CreateEnum
CREATE TYPE "MissionVariant" AS ENUM ('FULL', 'SMALLER');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'STEADY', 'HARD', 'BRUTAL');

-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('MORNING_PRINCIPLE', 'MISSION_HOUR', 'EVENING_REFLECTION');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "EntitlementStatus" NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "provider" TEXT,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "year" INTEGER,
    "coverImage" TEXT,
    "pickerNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "focus" TEXT,
    "promises" TEXT[],
    "lengthDays" INTEGER NOT NULL DEFAULT 30,
    "freeDays" INTEGER NOT NULL DEFAULT 3,
    "minutesPerDay" INTEGER NOT NULL DEFAULT 15,
    "coverImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "path_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDay" INTEGER NOT NULL,
    "endDay" INTEGER NOT NULL,

    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_day" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "principle" TEXT NOT NULL,
    "principleSource" TEXT,
    "lessonBody" TEXT NOT NULL,
    "lessonMinutes" INTEGER NOT NULL DEFAULT 3,
    "missionTitle" TEXT NOT NULL,
    "missionMinutes" INTEGER NOT NULL DEFAULT 15,
    "missionSteps" TEXT[],
    "smallerMissions" JSONB NOT NULL DEFAULT '[]',
    "evidencePrompt" TEXT,

    CONSTRAINT "path_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "pagePath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "timezone" TEXT,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "resubscribedAt" TIMESTAMP(3),
    "unsubscribeReason" TEXT,
    "lastOpenedAt" TIMESTAMP(3),
    "lastClickedAt" TIMESTAMP(3),
    "userId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "convertedIssueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue" (
    "id" TEXT NOT NULL,
    "kind" "IssueKind" NOT NULL DEFAULT 'BROADCAST',
    "number" INTEGER,
    "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "body" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "messageId" TEXT,
    "error" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_event" (
    "id" TEXT NOT NULL,
    "type" "EmailEventType" NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "issueId" TEXT,
    "deliveryId" TEXT,
    "url" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "fromName" TEXT NOT NULL DEFAULT 'The Inner War',
    "fromAddress" TEXT,
    "replyTo" TEXT,
    "usualSlotDay" INTEGER NOT NULL DEFAULT 0,
    "usualSlotTime" TEXT NOT NULL DEFAULT '09:00',
    "footer" TEXT NOT NULL DEFAULT 'You are getting this because you asked for it. [Unsubscribe]({{ unsubscribe_url }}) and it stops immediately.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battles" TEXT[],
    "pattern" TEXT,
    "bookSlug" TEXT,
    "dailyMinutes" INTEGER NOT NULL DEFAULT 15,
    "tone" "Tone" NOT NULL DEFAULT 'CALM',
    "lifeArea" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "missionHour" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_entry" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pathDayId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'OPEN',
    "lessonReadAt" TIMESTAMP(3),
    "missionStartedAt" TIMESTAMP(3),
    "missionCompletedAt" TIMESTAMP(3),
    "missionVariant" "MissionVariant",
    "minutesHeld" INTEGER,
    "firstMove" TEXT,
    "reflection" TEXT,
    "difficulty" "Difficulty",
    "evidence" TEXT,
    "evidenceSavedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_code" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "lines" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "time" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "entitlement_userId_idx" ON "entitlement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_provider_providerRef_key" ON "entitlement"("provider", "providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "book_slug_key" ON "book"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "path_slug_key" ON "path"("slug");

-- CreateIndex
CREATE INDEX "path_bookId_idx" ON "path"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_pathId_number_key" ON "chapter"("pathId", "number");

-- CreateIndex
CREATE INDEX "path_day_chapterId_idx" ON "path_day"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "path_day_pathId_dayNumber_key" ON "path_day"("pathId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_email_key" ON "subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_userId_key" ON "subscriber"("userId");

-- CreateIndex
CREATE INDEX "subscriber_status_idx" ON "subscriber"("status");

-- CreateIndex
CREATE INDEX "subscriber_subscribedAt_idx" ON "subscriber"("subscribedAt");

-- CreateIndex
CREATE INDEX "subscriber_convertedAt_idx" ON "subscriber"("convertedAt");

-- CreateIndex
CREATE UNIQUE INDEX "issue_number_key" ON "issue"("number");

-- CreateIndex
CREATE INDEX "issue_kind_status_idx" ON "issue"("kind", "status");

-- CreateIndex
CREATE INDEX "delivery_subscriberId_idx" ON "delivery"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_issueId_subscriberId_key" ON "delivery"("issueId", "subscriberId");

-- CreateIndex
CREATE INDEX "email_event_issueId_type_idx" ON "email_event"("issueId", "type");

-- CreateIndex
CREATE INDEX "email_event_subscriberId_createdAt_idx" ON "email_event"("subscriberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "suppression_email_key" ON "suppression"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_userId_key" ON "assessment"("userId");

-- CreateIndex
CREATE INDEX "campaign_userId_status_idx" ON "campaign"("userId", "status");

-- CreateIndex
CREATE INDEX "day_entry_pathDayId_idx" ON "day_entry"("pathDayId");

-- CreateIndex
CREATE UNIQUE INDEX "day_entry_campaignId_dayNumber_key" ON "day_entry"("campaignId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "personal_code_campaignId_key" ON "personal_code"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_userId_kind_key" ON "reminder"("userId", "kind");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path" ADD CONSTRAINT "path_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "path"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_day" ADD CONSTRAINT "path_day_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "path"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_day" ADD CONSTRAINT "path_day_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber" ADD CONSTRAINT "subscriber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber" ADD CONSTRAINT "subscriber_convertedIssueId_fkey" FOREIGN KEY ("convertedIssueId") REFERENCES "issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_event" ADD CONSTRAINT "email_event_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_event" ADD CONSTRAINT "email_event_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_event" ADD CONSTRAINT "email_event_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "path"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_entry" ADD CONSTRAINT "day_entry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_entry" ADD CONSTRAINT "day_entry_pathDayId_fkey" FOREIGN KEY ("pathDayId") REFERENCES "path_day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_code" ADD CONSTRAINT "personal_code_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
