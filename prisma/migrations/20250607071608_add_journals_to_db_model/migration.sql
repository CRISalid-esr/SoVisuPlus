/*
  Warnings:

  - A unique constraint covering the columns `[journalId]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "issue" TEXT,
ADD COLUMN     "journalId" INTEGER,
ADD COLUMN     "pages" TEXT,
ADD COLUMN     "volume" TEXT;

-- CreateTable
CREATE TABLE "Journal" (
    "id" SERIAL NOT NULL,
    "issnL" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "titles" TEXT[],

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalIdentifier" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "format" TEXT,
    "journalId" INTEGER NOT NULL,

    CONSTRAINT "JournalIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Journal_issnL_key" ON "Journal"("issnL");

-- CreateIndex
CREATE UNIQUE INDEX "Document_journalId_key" ON "Document"("journalId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalIdentifier" ADD CONSTRAINT "JournalIdentifier_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
