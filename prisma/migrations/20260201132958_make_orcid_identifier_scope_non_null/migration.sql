/*
  Warnings:

  - Made the column `scope` on table `OrcidIdentifier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrcidIdentifier" ALTER COLUMN "scope" SET NOT NULL;
