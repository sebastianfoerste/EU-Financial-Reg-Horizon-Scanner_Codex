-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('TRIAL', 'SOLO', 'BOUTIQUE', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "LicenceStatus" AS ENUM ('ACTIVE', 'APPLIED', 'WITHDRAWN', 'LAPSED');

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('RETAIL', 'PROFESSIONAL', 'ELIGIBLE_COUNTERPARTY', 'CORPORATE', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "FeedType" AS ENUM ('RSS', 'ATOM', 'HTML_SCRAPE', 'API', 'EUR_LEX_API', 'EMAIL_INGEST');

-- CreateEnum
CREATE TYPE "AttachmentExtractionStatus" AS ENUM ('PENDING', 'EXTRACTED', 'OCR_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'NEEDS_CHANGES', 'FALSE_POSITIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ParagraphDiffType" AS ENUM ('ADDED', 'REMOVED', 'CHANGED', 'UNCHANGED');

-- CreateEnum
CREATE TYPE "ImpactBucket" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL_REALTIME', 'EMAIL_DIGEST_DAILY', 'EMAIL_DIGEST_WEEKLY', 'SLACK', 'MS_TEAMS', 'WEBHOOK', 'IN_APP');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('DRAFT', 'APPROVED', 'BLOCKED_BY_CONFIG', 'SENDING', 'PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DeliveryAttemptStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BLOCKED_BY_CONFIG');

-- CreateEnum
CREATE TYPE "ServiceOfferingRuleAxis" AS ENUM ('REGULATION_FAMILY', 'ACTIVITY', 'LICENCE_TYPE', 'TOPIC', 'JURISDICTION');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('ALERT_CTA', 'DASHBOARD_CTA', 'EMAIL_DIGEST_CTA', 'SALES_DIRECT', 'EVENT', 'NEWSLETTER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FetchStatus" AS ENUM ('RUNNING', 'OK', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceReuseStatus" AS ENUM ('UNKNOWN', 'REUSE_PERMITTED', 'ATTRIBUTION_REQUIRED', 'REVIEW_REQUIRED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('RESEND', 'SLACK', 'MS_TEAMS', 'HUBSPOT');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ENABLED', 'DISABLED', 'MISCONFIGURED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "authProvider" TEXT NOT NULL DEFAULT 'clerk',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "registeredSeat" TEXT,
    "vatId" TEXT,
    "primaryContact" TEXT,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "hubspotCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "renewsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "monthlyPriceEur" DECIMAL(10,2) NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "stripeSubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMap" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licence" (
    "id" TEXT NOT NULL,
    "productMapId" TEXT NOT NULL,
    "licenceType" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "licenceReference" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "LicenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,

    CONSTRAINT "Licence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLine" (
    "id" TEXT NOT NULL,
    "productMapId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activities" TEXT[],
    "customerSegment" "CustomerSegment"[],
    "description" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMapJurisdiction" (
    "id" TEXT NOT NULL,
    "productMapId" TEXT NOT NULL,
    "jurisdictionCode" TEXT NOT NULL,
    "authority" TEXT,
    "isHomeMember" BOOLEAN NOT NULL DEFAULT false,
    "isPassportedInto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductMapJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "jurisdictionCode" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "feedType" "FeedType" NOT NULL,
    "feedUrl" TEXT,
    "pollIntervalMin" INTEGER NOT NULL DEFAULT 60,
    "language" TEXT NOT NULL DEFAULT 'de',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "etag" TEXT,
    "lastModified" TEXT,
    "cursorJson" JSONB,
    "adapterStatusJson" JSONB,
    "notes" TEXT,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "language" TEXT NOT NULL,
    "publicationType" TEXT NOT NULL,
    "rawHash" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyMarkdown" TEXT,
    "sourceMetadataJson" JSONB,
    "pageCount" INTEGER,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationVersion" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawHash" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "diffFromPrevious" TEXT,
    "semanticChangesJson" JSONB,
    "changeSummary" TEXT,

    CONSTRAINT "PublicationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "extractedText" TEXT,
    "extractionStatus" "AttachmentExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "ocrRequired" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationEmbedding" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dim" INTEGER NOT NULL,
    "vector" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "yamlContent" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "TaxonomyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "taxonomyVersionId" TEXT NOT NULL,
    "regulationFamilies" TEXT[],
    "subTopics" TEXT[],
    "activities" TEXT[],
    "licenceTypes" TEXT[],
    "topicPaths" TEXT[],
    "jurisdictions" TEXT[],
    "summary" TEXT NOT NULL,
    "whatChanged" TEXT,
    "whoIsAffected" TEXT,
    "deadline" TIMESTAMP(3),
    "recommendedAction" TEXT,
    "serviceOfferingIds" TEXT[],
    "classifierModel" TEXT NOT NULL,
    "classifierVersion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reviewedByHuman" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewQueueItem" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "assignedToUserId" TEXT,
    "reviewerName" TEXT,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationRevision" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "classificationId" TEXT,
    "beforeJson" JSONB NOT NULL,
    "afterJson" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationParagraph" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "publicationVersionId" TEXT NOT NULL,
    "paragraphIndex" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationParagraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParagraphDiff" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "publicationVersionId" TEXT NOT NULL,
    "paragraphIndex" INTEGER NOT NULL,
    "changeType" "ParagraphDiffType" NOT NULL,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    "beforeText" TEXT,
    "afterText" TEXT,
    "unifiedDiff" TEXT,
    "semanticSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParagraphDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactScore" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productMapId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "bucket" "ImpactBucket" NOT NULL,
    "rationale" TEXT NOT NULL,
    "matchedLicences" TEXT[],
    "matchedActivities" TEXT[],
    "matchedJurisdictions" TEXT[],
    "ruleVersion" TEXT NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "impactScoreId" TEXT,
    "channel" "AlertChannel" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "targetMetadataJson" JSONB,
    "sentAt" TIMESTAMP(3),
    "payloadJson" JSONB NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRead" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "DeliveryAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "requestJson" JSONB,
    "responseJson" JSONB,
    "errorMessage" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceIndication" TEXT NOT NULL,
    "calendlyUrl" TEXT,
    "hubspotDealStage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOfferingRule" (
    "id" TEXT NOT NULL,
    "serviceOfferingId" TEXT NOT NULL,
    "axis" "ServiceOfferingRuleAxis" NOT NULL,
    "values" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOfferingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLead" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "serviceOfferingId" TEXT NOT NULL,
    "publicationId" TEXT,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "hubspotDealId" TEXT,
    "estimatedValueEur" DECIMAL(12,2),
    "closedValueEur" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "FetchStatus" NOT NULL DEFAULT 'RUNNING',
    "publicationsSeen" INTEGER NOT NULL DEFAULT 0,
    "publicationsNew" INTEGER NOT NULL DEFAULT 0,
    "publicationsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "FetchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDiligence" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reuseStatus" "SourceReuseStatus" NOT NULL DEFAULT 'UNKNOWN',
    "attributionRequirement" TEXT,
    "robotsNotes" TEXT,
    "allowedCadenceMin" INTEGER,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "ownerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceDiligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filtersJson" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISABLED',
    "nonSecretConfigJson" JSONB,
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "organisationId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Organisation_name_idx" ON "Organisation"("name");

-- CreateIndex
CREATE INDEX "Membership_organisationId_idx" ON "Membership"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organisationId_key" ON "Membership"("userId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubId_key" ON "Subscription"("stripeSubId");

-- CreateIndex
CREATE INDEX "Subscription_organisationId_idx" ON "Subscription"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_organisationId_idx" ON "ApiToken"("organisationId");

-- CreateIndex
CREATE INDEX "ProductMap_organisationId_idx" ON "ProductMap"("organisationId");

-- CreateIndex
CREATE INDEX "Licence_productMapId_idx" ON "Licence"("productMapId");

-- CreateIndex
CREATE INDEX "Licence_licenceType_idx" ON "Licence"("licenceType");

-- CreateIndex
CREATE INDEX "ProductLine_productMapId_idx" ON "ProductLine"("productMapId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapJurisdiction_productMapId_jurisdictionCode_key" ON "ProductMapJurisdiction"("productMapId", "jurisdictionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Source_code_key" ON "Source"("code");

-- CreateIndex
CREATE INDEX "Source_jurisdictionCode_idx" ON "Source"("jurisdictionCode");

-- CreateIndex
CREATE INDEX "Publication_publishedAt_idx" ON "Publication"("publishedAt");

-- CreateIndex
CREATE INDEX "Publication_publicationType_idx" ON "Publication"("publicationType");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_sourceId_externalId_key" ON "Publication"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_sourceUrl_rawHash_key" ON "Publication"("sourceUrl", "rawHash");

-- CreateIndex
CREATE INDEX "PublicationVersion_publicationId_idx" ON "PublicationVersion"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationVersion_publicationId_versionNumber_key" ON "PublicationVersion"("publicationId", "versionNumber");

-- CreateIndex
CREATE INDEX "Attachment_publicationId_idx" ON "Attachment"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationEmbedding_publicationId_key" ON "PublicationEmbedding"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyVersion_version_key" ON "TaxonomyVersion"("version");

-- CreateIndex
CREATE INDEX "Classification_deadline_idx" ON "Classification"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_publicationId_taxonomyVersionId_key" ON "Classification"("publicationId", "taxonomyVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewQueueItem_publicationId_key" ON "ReviewQueueItem"("publicationId");

-- CreateIndex
CREATE INDEX "ReviewQueueItem_status_priority_idx" ON "ReviewQueueItem"("status", "priority");

-- CreateIndex
CREATE INDEX "ReviewQueueItem_updatedAt_idx" ON "ReviewQueueItem"("updatedAt");

-- CreateIndex
CREATE INDEX "ClassificationRevision_publicationId_createdAt_idx" ON "ClassificationRevision"("publicationId", "createdAt");

-- CreateIndex
CREATE INDEX "PublicationParagraph_publicationId_contentHash_idx" ON "PublicationParagraph"("publicationId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationParagraph_publicationVersionId_paragraphIndex_key" ON "PublicationParagraph"("publicationVersionId", "paragraphIndex");

-- CreateIndex
CREATE INDEX "ParagraphDiff_publicationId_createdAt_idx" ON "ParagraphDiff"("publicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ParagraphDiff_publicationVersionId_idx" ON "ParagraphDiff"("publicationVersionId");

-- CreateIndex
CREATE INDEX "ImpactScore_organisationId_scoredAt_idx" ON "ImpactScore"("organisationId", "scoredAt");

-- CreateIndex
CREATE INDEX "ImpactScore_bucket_idx" ON "ImpactScore"("bucket");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactScore_publicationId_productMapId_key" ON "ImpactScore"("publicationId", "productMapId");

-- CreateIndex
CREATE INDEX "Alert_organisationId_status_idx" ON "Alert"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Alert_scheduledFor_idx" ON "Alert"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "AlertRead_alertId_userId_key" ON "AlertRead"("alertId", "userId");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_alertId_attemptedAt_idx" ON "DeliveryAttempt"("alertId", "attemptedAt");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_provider_status_idx" ON "DeliveryAttempt"("provider", "status");

-- CreateIndex
CREATE INDEX "ServiceOfferingRule_serviceOfferingId_isActive_idx" ON "ServiceOfferingRule"("serviceOfferingId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceLead_hubspotDealId_key" ON "ServiceLead"("hubspotDealId");

-- CreateIndex
CREATE INDEX "ServiceLead_organisationId_status_idx" ON "ServiceLead"("organisationId", "status");

-- CreateIndex
CREATE INDEX "FetchRun_sourceId_startedAt_idx" ON "FetchRun"("sourceId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceDiligence_sourceId_key" ON "SourceDiligence"("sourceId");

-- CreateIndex
CREATE INDEX "SourceDiligence_reuseStatus_idx" ON "SourceDiligence"("reuseStatus");

-- CreateIndex
CREATE INDEX "SourceDiligence_nextReviewAt_idx" ON "SourceDiligence"("nextReviewAt");

-- CreateIndex
CREATE INDEX "SavedView_organisationId_isDefault_idx" ON "SavedView"("organisationId", "isDefault");

-- CreateIndex
CREATE INDEX "IntegrationConfig_provider_status_idx" ON "IntegrationConfig"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfig_organisationId_provider_key" ON "IntegrationConfig"("organisationId", "provider");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_organisationId_createdAt_idx" ON "AuditLog"("organisationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMap" ADD CONSTRAINT "ProductMap_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licence" ADD CONSTRAINT "Licence_productMapId_fkey" FOREIGN KEY ("productMapId") REFERENCES "ProductMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLine" ADD CONSTRAINT "ProductLine_productMapId_fkey" FOREIGN KEY ("productMapId") REFERENCES "ProductMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapJurisdiction" ADD CONSTRAINT "ProductMapJurisdiction_productMapId_fkey" FOREIGN KEY ("productMapId") REFERENCES "ProductMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationVersion" ADD CONSTRAINT "PublicationVersion_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEmbedding" ADD CONSTRAINT "PublicationEmbedding_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_taxonomyVersionId_fkey" FOREIGN KEY ("taxonomyVersionId") REFERENCES "TaxonomyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewQueueItem" ADD CONSTRAINT "ReviewQueueItem_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationRevision" ADD CONSTRAINT "ClassificationRevision_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationRevision" ADD CONSTRAINT "ClassificationRevision_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationParagraph" ADD CONSTRAINT "PublicationParagraph_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationParagraph" ADD CONSTRAINT "PublicationParagraph_publicationVersionId_fkey" FOREIGN KEY ("publicationVersionId") REFERENCES "PublicationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphDiff" ADD CONSTRAINT "ParagraphDiff_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphDiff" ADD CONSTRAINT "ParagraphDiff_publicationVersionId_fkey" FOREIGN KEY ("publicationVersionId") REFERENCES "PublicationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactScore" ADD CONSTRAINT "ImpactScore_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactScore" ADD CONSTRAINT "ImpactScore_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactScore" ADD CONSTRAINT "ImpactScore_productMapId_fkey" FOREIGN KEY ("productMapId") REFERENCES "ProductMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRead" ADD CONSTRAINT "AlertRead_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRead" ADD CONSTRAINT "AlertRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOfferingRule" ADD CONSTRAINT "ServiceOfferingRule_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES "ServiceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLead" ADD CONSTRAINT "ServiceLead_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLead" ADD CONSTRAINT "ServiceLead_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES "ServiceOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FetchRun" ADD CONSTRAINT "FetchRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDiligence" ADD CONSTRAINT "SourceDiligence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConfig" ADD CONSTRAINT "IntegrationConfig_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

