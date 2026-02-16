/*
  Warnings:

  - The values [IdRef,Wikidata] on the enum `AuthorityOrganizationIdentifierType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuthorityOrganizationIdentifierType_new" AS ENUM ('fundref', 'grid', 'hal', 'idref', 'isni', 'nns', 'openalex', 'ror', 'scopus', 'viaf', 'wikidata');
ALTER TABLE "AuthorityOrganizationIdentifier" ALTER COLUMN "type" TYPE "AuthorityOrganizationIdentifierType_new" USING ("type"::text::"AuthorityOrganizationIdentifierType_new");
ALTER TYPE "AuthorityOrganizationIdentifierType" RENAME TO "AuthorityOrganizationIdentifierType_old";
ALTER TYPE "AuthorityOrganizationIdentifierType_new" RENAME TO "AuthorityOrganizationIdentifierType";
DROP TYPE "public"."AuthorityOrganizationIdentifierType_old";
COMMIT;
