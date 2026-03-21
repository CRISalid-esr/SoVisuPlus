/*
  Warnings:

  - The values [ResearchStructure] on the enum `EntityType` will be removed. If these variants are still used in the database, this will fail.
  - The values [ResearchStructure] on the enum `PermissionSubject` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `researchStructureId` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the `ResearchStructure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchStructureDescription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchStructureIdentifier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchStructureName` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[personId,researchUnitId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `researchUnitId` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ResearchUnitIdentifierType" AS ENUM ('hal', 'idref', 'isni', 'local', 'nns', 'openalex', 'ror', 'scopus', 'siren', 'siret', 'uai', 'viaf', 'wikidata');

-- AlterEnum
BEGIN;
CREATE TYPE "EntityType_new" AS ENUM ('Person', 'ResearchUnit', 'Institution', 'InstitutionDivision');
ALTER TABLE "UserRoleScope" ALTER COLUMN "entityType" TYPE "EntityType_new" USING ("entityType"::text::"EntityType_new");
ALTER TYPE "EntityType" RENAME TO "EntityType_old";
ALTER TYPE "EntityType_new" RENAME TO "EntityType";
DROP TYPE "public"."EntityType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PermissionSubject_new" AS ENUM ('all', 'Document', 'DocumentRecord', 'Person', 'ResearchUnit', 'Membership', 'Institution', 'InstitutionDivision');
ALTER TABLE "Permission" ALTER COLUMN "subject" TYPE "PermissionSubject_new" USING ("subject"::text::"PermissionSubject_new");
ALTER TYPE "PermissionSubject" RENAME TO "PermissionSubject_old";
ALTER TYPE "PermissionSubject_new" RENAME TO "PermissionSubject";
DROP TYPE "public"."PermissionSubject_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_researchStructureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ResearchStructureDescription" DROP CONSTRAINT "ResearchStructureDescription_researchStructureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ResearchStructureIdentifier" DROP CONSTRAINT "ResearchStructureIdentifier_researchStructureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ResearchStructureName" DROP CONSTRAINT "ResearchStructureName_researchStructureId_fkey";

-- DropIndex
DROP INDEX "public"."Membership_personId_researchStructureId_key";

-- DropIndex
DROP INDEX "public"."Membership_researchStructureId_idx";

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "researchStructureId",
ADD COLUMN     "researchUnitId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."ResearchStructure";

-- DropTable
DROP TABLE "public"."ResearchStructureDescription";

-- DropTable
DROP TABLE "public"."ResearchStructureIdentifier";

-- DropTable
DROP TABLE "public"."ResearchStructureName";

-- DropEnum
DROP TYPE "public"."ResearchStructureIdentifierType";

-- CreateTable
CREATE TABLE "ResearchUnit" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "acronym" TEXT,
    "signature" TEXT,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,

    CONSTRAINT "ResearchUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUnitName" (
    "id" SERIAL NOT NULL,
    "researchUnitId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    CONSTRAINT "ResearchUnitName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUnitDescription" (
    "id" SERIAL NOT NULL,
    "researchUnitId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(2000) NOT NULL,

    CONSTRAINT "ResearchUnitDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUnitIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "ResearchUnitIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "researchUnitId" INTEGER NOT NULL,

    CONSTRAINT "ResearchUnitIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnit_uid_key" ON "ResearchUnit"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnit_slug_key" ON "ResearchUnit"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnitName_researchUnitId_language_key" ON "ResearchUnitName"("researchUnitId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnitDescription_researchUnitId_language_key" ON "ResearchUnitDescription"("researchUnitId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnitIdentifier_type_value_key" ON "ResearchUnitIdentifier"("type", "value");

-- CreateIndex
CREATE INDEX "Membership_researchUnitId_idx" ON "Membership"("researchUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_personId_researchUnitId_key" ON "Membership"("personId", "researchUnitId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUnitName" ADD CONSTRAINT "ResearchUnitName_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUnitDescription" ADD CONSTRAINT "ResearchUnitDescription_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUnitIdentifier" ADD CONSTRAINT "ResearchUnitIdentifier_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
