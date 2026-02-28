/*
  Warnings:

  - You are about to drop the column `uid` on the `PublicationIdentifier` table. All the data in the column will be lost.
  - Changed the type of `type` on the `PublicationIdentifier` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PublicationIdentifierType" AS ENUM ('hal', 'doi', 'open_alex', 'uri', 'sudoc_ppn', 'nnt', 'prodinra', 'wos', 'pmid', 'arxiv', 'ppn', 'pubmed', 'pii', 'pubmedcentral', 'ird', 'sciencespo', 'ineris', 'unknown');

-- DropIndex
DROP INDEX "public"."PublicationIdentifier_uid_key";

-- AlterTable
ALTER TABLE "PublicationIdentifier" DROP COLUMN "uid",
DROP COLUMN "type",
ADD COLUMN     "type" "PublicationIdentifierType" NOT NULL;
