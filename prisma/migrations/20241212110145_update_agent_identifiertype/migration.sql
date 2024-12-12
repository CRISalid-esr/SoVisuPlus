/*
  Warnings:

  - The values [ORCID,ID_REF,ID_HAL,SCOPUSEID] on the enum `AgentIdentifierType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AgentIdentifierType_new" AS ENUM ('orcid', 'idref', 'id_hal_s', 'id_hal_i', 'scopus_eid', 'local');
ALTER TABLE "AgentIdentifier" ALTER COLUMN "type" TYPE "AgentIdentifierType_new" USING ("type"::text::"AgentIdentifierType_new");
ALTER TYPE "AgentIdentifierType" RENAME TO "AgentIdentifierType_old";
ALTER TYPE "AgentIdentifierType_new" RENAME TO "AgentIdentifierType";
DROP TYPE "AgentIdentifierType_old";
COMMIT;
