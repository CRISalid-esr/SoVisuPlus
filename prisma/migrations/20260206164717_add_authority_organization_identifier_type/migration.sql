/*
  Warnings:

  - Changed the type of `type` on the `AuthorityOrganizationIdentifier` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AuthorityOrganizationIdentifierType" AS ENUM ('openalex', 'ror', 'hal', 'IdRef', 'isni', 'nns', 'Wikidata', 'viaf');

-- AlterTable
ALTER TABLE "AuthorityOrganizationIdentifier" DROP COLUMN "type",
ADD COLUMN     "type" "AuthorityOrganizationIdentifierType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityOrganizationIdentifier_type_value_key" ON "AuthorityOrganizationIdentifier"("type", "value");
