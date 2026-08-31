-- AlterEnum
ALTER TYPE "PermissionSubject" ADD VALUE 'OrganizationUnit';

-- AlterTable
ALTER TABLE "OrganizationUnit" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenEffective" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "OrganizationUnit_hiddenEffective_idx" ON "OrganizationUnit"("hiddenEffective");
