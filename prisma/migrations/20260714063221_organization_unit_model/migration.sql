/*
  Warnings:

  - You are about to drop the column `researchUnitId` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the `ResearchUnit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchUnitDescription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchUnitIdentifier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchUnitName` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[personId,organizationUnitId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationUnitId` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrganizationGenericType" AS ENUM ('institution', 'institution_subdivision', 'unit', 'unit_subdivision', 'team');

-- CreateEnum
CREATE TYPE "OrganizationCategory" AS ENUM ('institution', 'institution_subdivision', 'research_unit', 'support_unit', 'administrative_unit', 'teaching_unit', 'unit_subdivision', 'team');

-- CreateEnum
CREATE TYPE "OrganizationLabelKind" AS ENUM ('short', 'long');

-- CreateEnum
CREATE TYPE "OrganizationRelationKind" AS ENUM ('part_of', 'member_of');

-- CreateEnum
CREATE TYPE "OrganizationIdentifierType" AS ENUM ('hal', 'idref', 'isni', 'local', 'nns', 'openalex', 'ror', 'scopus', 'siren', 'siret', 'uai', 'viaf', 'wikidata');

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_researchUnitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ResearchUnitDescription" DROP CONSTRAINT "ResearchUnitDescription_researchUnitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ResearchUnitIdentifier" DROP CONSTRAINT "ResearchUnitIdentifier_researchUnitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ResearchUnitName" DROP CONSTRAINT "ResearchUnitName_researchUnitId_fkey";

-- DropIndex
DROP INDEX "public"."Membership_personId_researchUnitId_key";

-- DropIndex
DROP INDEX "public"."Membership_researchUnitId_idx";

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "researchUnitId",
ADD COLUMN     "organizationUnitId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."ResearchUnit";

-- DropTable
DROP TABLE "public"."ResearchUnitDescription";

-- DropTable
DROP TABLE "public"."ResearchUnitIdentifier";

-- DropTable
DROP TABLE "public"."ResearchUnitName";

-- DropEnum
DROP TYPE "public"."ResearchUnitIdentifierType";

-- CreateTable
CREATE TABLE "Employment" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "organizationUnitId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "positionCode" TEXT,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "genericType" "OrganizationGenericType" NOT NULL,
    "category" "OrganizationCategory" NOT NULL,
    "nationalType" TEXT,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "acronym" TEXT,
    "slug" TEXT,
    "localTypes" JSONB,

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnitLabel" (
    "id" SERIAL NOT NULL,
    "organizationUnitId" INTEGER NOT NULL,
    "kind" "OrganizationLabelKind" NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    CONSTRAINT "OrganizationUnitLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnitDescription" (
    "id" SERIAL NOT NULL,
    "organizationUnitId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(2000) NOT NULL,

    CONSTRAINT "OrganizationUnitDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnitIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "OrganizationIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "organizationUnitId" INTEGER NOT NULL,

    CONSTRAINT "OrganizationUnitIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRelationship" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,
    "kind" "OrganizationRelationKind" NOT NULL,
    "position" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "OrganizationRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employment_organizationUnitId_idx" ON "Employment"("organizationUnitId");

-- CreateIndex
CREATE INDEX "Employment_personId_idx" ON "Employment"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Employment_personId_organizationUnitId_key" ON "Employment"("personId", "organizationUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnit_uid_key" ON "OrganizationUnit"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnit_slug_key" ON "OrganizationUnit"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnitLabel_organizationUnitId_kind_language_key" ON "OrganizationUnitLabel"("organizationUnitId", "kind", "language");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnitDescription_organizationUnitId_language_key" ON "OrganizationUnitDescription"("organizationUnitId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnitIdentifier_type_value_key" ON "OrganizationUnitIdentifier"("type", "value");

-- CreateIndex
CREATE INDEX "OrganizationRelationship_parentId_idx" ON "OrganizationRelationship"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRelationship_childId_parentId_kind_key" ON "OrganizationRelationship"("childId", "parentId", "kind");

-- CreateIndex
CREATE INDEX "Membership_organizationUnitId_idx" ON "Membership"("organizationUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_personId_organizationUnitId_key" ON "Membership"("personId", "organizationUnitId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitLabel" ADD CONSTRAINT "OrganizationUnitLabel_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitDescription" ADD CONSTRAINT "OrganizationUnitDescription_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitIdentifier" ADD CONSTRAINT "OrganizationUnitIdentifier_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRelationship" ADD CONSTRAINT "OrganizationRelationship_childId_fkey" FOREIGN KEY ("childId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRelationship" ADD CONSTRAINT "OrganizationRelationship_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
