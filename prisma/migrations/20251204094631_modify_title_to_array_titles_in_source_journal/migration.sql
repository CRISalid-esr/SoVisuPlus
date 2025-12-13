/*
  Warnings:

  - You are about to drop the column `title` on the `SourceJournal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SourceJournal" DROP COLUMN "title",
ADD COLUMN     "titles" TEXT[];
