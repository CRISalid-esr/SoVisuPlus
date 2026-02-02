/*
  Warnings:

  - Made the column `expiresAt` on table `OrcidIdentifier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrcidIdentifier" ALTER COLUMN "expiresAt" SET NOT NULL;
