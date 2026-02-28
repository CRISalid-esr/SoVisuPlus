/*
  Warnings:

  - The values [rnsr] on the enum `ResearchStructureIdentifierType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "PersonIdentifierType" ADD VALUE 'eppn';

-- AlterEnum
BEGIN;
CREATE TYPE "ResearchStructureIdentifierType_new" AS ENUM ('local', 'nns', 'idref', 'ror', 'hal', 'scopus_id');
ALTER TABLE "ResearchStructureIdentifier" ALTER COLUMN "type" TYPE "ResearchStructureIdentifierType_new" USING ("type"::text::"ResearchStructureIdentifierType_new");
ALTER TYPE "ResearchStructureIdentifierType" RENAME TO "ResearchStructureIdentifierType_old";
ALTER TYPE "ResearchStructureIdentifierType_new" RENAME TO "ResearchStructureIdentifierType";
DROP TYPE "ResearchStructureIdentifierType_old";
COMMIT;
