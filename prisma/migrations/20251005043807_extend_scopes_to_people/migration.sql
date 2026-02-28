/*
  Warnings:

  - You are about to drop the column `organizationType` on the `UserRoleScope` table. All the data in the column will be lost.
  - You are about to drop the column `organizationUid` on the `UserRoleScope` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,roleId,entityType,entityUid]` on the table `UserRoleScope` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entityType` to the `UserRoleScope` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityUid` to the `UserRoleScope` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('Person', 'ResearchStructure', 'Institution', 'InstitutionDivision');

-- DropIndex
DROP INDEX "public"."UserRoleScope_organizationType_organizationUid_idx";

-- DropIndex
DROP INDEX "public"."UserRoleScope_userId_roleId_organizationType_organizationUi_key";

-- AlterTable
ALTER TABLE "public"."UserRoleScope" DROP COLUMN "organizationType",
DROP COLUMN "organizationUid",
ADD COLUMN     "entityType" "public"."EntityType" NOT NULL,
ADD COLUMN     "entityUid" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."OrganizationType";

-- CreateIndex
CREATE INDEX "UserRoleScope_entityType_entityUid_idx" ON "public"."UserRoleScope"("entityType", "entityUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleScope_userId_roleId_entityType_entityUid_key" ON "public"."UserRoleScope"("userId", "roleId", "entityType", "entityUid");
