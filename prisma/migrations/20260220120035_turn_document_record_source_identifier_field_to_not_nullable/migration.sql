/*
  Warnings:

  - Made the column `sourceIdentifier` on table `DocumentRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DocumentRecord" ALTER COLUMN "sourceIdentifier" SET NOT NULL;
