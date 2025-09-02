/*
  Warnings:

  - You are about to drop the column `titles` on the `Journal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Journal" DROP COLUMN "titles";

-- CreateTable
CREATE TABLE "JournalTitle" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "journalId" INTEGER NOT NULL,

    CONSTRAINT "JournalTitle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JournalTitle" ADD CONSTRAINT "JournalTitle_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
