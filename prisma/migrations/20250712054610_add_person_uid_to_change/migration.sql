/*
  Warnings:

  - Added the required column `personUid` to the `Change` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Change" ADD COLUMN     "personUid" TEXT NOT NULL;
