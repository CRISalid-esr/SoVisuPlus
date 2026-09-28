-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- AlterTable
ALTER TABLE "DocumentTitle" ADD COLUMN     "normalizedValue" TEXT;

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "normalizedTitle" TEXT;

-- AlterTable
ALTER TABLE "OrganizationUnit" ADD COLUMN     "normalizedAcronym" TEXT;

-- AlterTable
ALTER TABLE "OrganizationUnitLabel" ADD COLUMN     "normalizedValue" TEXT;

-- CreateIndex
CREATE INDEX "DocumentTitle_normalizedValue_idx" ON "DocumentTitle" USING GIN ("normalizedValue" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Journal_normalizedTitle_idx" ON "Journal" USING GIN ("normalizedTitle" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "OrganizationUnitLabel_normalizedValue_idx" ON "OrganizationUnitLabel" USING GIN ("normalizedValue" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Person_normalizedName_idx" ON "Person" USING GIN ("normalizedName" gin_trgm_ops);
