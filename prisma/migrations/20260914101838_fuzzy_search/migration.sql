-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- AlterTable
ALTER TABLE "DocumentAbstract" ADD COLUMN     "normalizedValue" TEXT;

-- AlterTable
ALTER TABLE "DocumentTitle" ADD COLUMN     "normalizedValue" VARCHAR(2000);

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "normalizedTitle" TEXT;

-- AlterTable
ALTER TABLE "OrganizationUnit" ADD COLUMN     "normalizedAcronym" TEXT;

-- AlterTable
ALTER TABLE "OrganizationUnitLabel" ADD COLUMN     "normalizedValue" VARCHAR(255);

-- CreateIndex
CREATE INDEX "DocumentAbstract_normalizedValue_idx" ON "DocumentAbstract" USING GIN ("normalizedValue" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "DocumentTitle_normalizedValue_idx" ON "DocumentTitle" USING GIN ("normalizedValue" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Journal_normalizedTitle_idx" ON "Journal" USING GIN ("normalizedTitle" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "OrganizationUnitLabel_normalizedValue_idx" ON "OrganizationUnitLabel" USING GIN ("normalizedValue" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Person_normalizedName_idx" ON "Person" USING GIN ("normalizedName" gin_trgm_ops);
