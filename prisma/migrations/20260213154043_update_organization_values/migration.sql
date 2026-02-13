/*
  Warnings:

  - The values [fundref,grid] on the enum `AuthorityOrganizationIdentifierType` will be removed. If these variants are still used in the database, this will fail.
  - The values [fundref,grid] on the enum `ResearchStructureIdentifierType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuthorityOrganizationIdentifierType_new" AS ENUM ('hal', 'idref', 'isni', 'local', 'nns', 'openalex', 'ror', 'scopus', 'siren', 'siret', 'uai', 'viaf', 'wikidata');
ALTER TABLE "AuthorityOrganizationIdentifier" ALTER COLUMN "type" TYPE "AuthorityOrganizationIdentifierType_new" USING ("type"::text::"AuthorityOrganizationIdentifierType_new");
ALTER TYPE "AuthorityOrganizationIdentifierType" RENAME TO "AuthorityOrganizationIdentifierType_old";
ALTER TYPE "AuthorityOrganizationIdentifierType_new" RENAME TO "AuthorityOrganizationIdentifierType";
DROP TYPE "public"."AuthorityOrganizationIdentifierType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ResearchStructureIdentifierType_new" AS ENUM ('hal', 'idref', 'isni', 'local', 'nns', 'openalex', 'ror', 'scopus', 'siren', 'siret', 'uai', 'viaf', 'wikidata');
ALTER TABLE "ResearchStructureIdentifier" ALTER COLUMN "type" TYPE "ResearchStructureIdentifierType_new" USING ("type"::text::"ResearchStructureIdentifierType_new");
ALTER TYPE "ResearchStructureIdentifierType" RENAME TO "ResearchStructureIdentifierType_old";
ALTER TYPE "ResearchStructureIdentifierType_new" RENAME TO "ResearchStructureIdentifierType";
DROP TYPE "public"."ResearchStructureIdentifierType_old";
COMMIT;
