/*
  Warnings:

  - The values [local,scopus_id] on the enum `ResearchStructureIdentifierType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ResearchStructureIdentifierType_new" AS ENUM ('fundref', 'grid', 'hal', 'idref', 'isni', 'nns', 'openalex', 'ror', 'scopus', 'viaf', 'wikidata');
ALTER TABLE "ResearchStructureIdentifier" ALTER COLUMN "type" TYPE "ResearchStructureIdentifierType_new" USING ("type"::text::"ResearchStructureIdentifierType_new");
ALTER TYPE "ResearchStructureIdentifierType" RENAME TO "ResearchStructureIdentifierType_old";
ALTER TYPE "ResearchStructureIdentifierType_new" RENAME TO "ResearchStructureIdentifierType";
DROP TYPE "public"."ResearchStructureIdentifierType_old";
COMMIT;
