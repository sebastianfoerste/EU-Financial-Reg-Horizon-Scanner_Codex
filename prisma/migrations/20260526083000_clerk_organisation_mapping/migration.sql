-- Add an explicit mapping from a Clerk organisation to the local tenant.
ALTER TABLE "Organisation" ADD COLUMN "externalId" TEXT;
ALTER TABLE "User" ADD COLUMN "isInternalOperator" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Organisation_externalId_key" ON "Organisation"("externalId");
