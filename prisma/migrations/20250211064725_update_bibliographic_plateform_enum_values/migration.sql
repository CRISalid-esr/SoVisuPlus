/*
  Warnings:

  - The values [HAL,SCANR,IDREF,OPENALEX,SCOPUS] on the enum `BibliographicPlatform` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BibliographicPlatform_new" AS ENUM ('hal', 'scanr', 'idref', 'openalex', 'scopus');
ALTER TABLE "DocumentRecord" ALTER COLUMN "platform" TYPE "BibliographicPlatform_new" USING ("platform"::text::"BibliographicPlatform_new");
ALTER TYPE "BibliographicPlatform" RENAME TO "BibliographicPlatform_old";
ALTER TYPE "BibliographicPlatform_new" RENAME TO "BibliographicPlatform";
DROP TYPE "BibliographicPlatform_old";
COMMIT;
