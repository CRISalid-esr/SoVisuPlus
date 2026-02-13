/*
  Warnings:

  - The values [id_hal_s,id_hal_i,scopus_eid,hal_login] on the enum `PersonIdentifierType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PersonIdentifierType_new" AS ENUM ('eppn', 'idref', 'idhals', 'idhali', 'local', 'orcid', 'scopus');
ALTER TABLE "PersonIdentifier" ALTER COLUMN "type" TYPE "PersonIdentifierType_new" USING ("type"::text::"PersonIdentifierType_new");
ALTER TYPE "PersonIdentifierType" RENAME TO "PersonIdentifierType_old";
ALTER TYPE "PersonIdentifierType_new" RENAME TO "PersonIdentifierType";
DROP TYPE "public"."PersonIdentifierType_old";
COMMIT;
