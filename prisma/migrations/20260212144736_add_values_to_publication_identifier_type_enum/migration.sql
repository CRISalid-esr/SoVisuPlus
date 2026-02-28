/*
  Warnings:

  - The values [open_alex,sudoc_ppn,pubmed] on the enum `PublicationIdentifierType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PublicationIdentifierType_new" AS ENUM ('arxiv', 'bibcode', 'biorxiv', 'cern', 'chemrxiv', 'doi', 'ensam', 'hal', 'ineris', 'inspire', 'ird', 'irstea', 'irthesaurus', 'meditagri', 'nnt', 'oatao', 'okina', 'openalex', 'pii', 'pmid', 'ppn', 'prodinra', 'pubmedcentral', 'sciencespo', 'swhid', 'uri', 'wos', 'unknown');
ALTER TABLE "PublicationIdentifier" ALTER COLUMN "type" TYPE "PublicationIdentifierType_new" USING ("type"::text::"PublicationIdentifierType_new");
ALTER TYPE "PublicationIdentifierType" RENAME TO "PublicationIdentifierType_old";
ALTER TYPE "PublicationIdentifierType_new" RENAME TO "PublicationIdentifierType";
DROP TYPE "public"."PublicationIdentifierType_old";
COMMIT;
