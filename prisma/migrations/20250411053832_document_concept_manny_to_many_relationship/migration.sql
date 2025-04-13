/*
  Warnings:

  - You are about to drop the column `documentId` on the `Concept` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Concept" DROP CONSTRAINT "Concept_documentId_fkey";

-- DropIndex
DROP INDEX "Concept_documentId_idx";

-- AlterTable
ALTER TABLE "Concept" DROP COLUMN "documentId";

-- CreateTable
CREATE TABLE "_ConceptToDocument" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ConceptToDocument_AB_unique" ON "_ConceptToDocument"("A", "B");

-- CreateIndex
CREATE INDEX "_ConceptToDocument_B_index" ON "_ConceptToDocument"("B");

-- AddForeignKey
ALTER TABLE "_ConceptToDocument" ADD CONSTRAINT "_ConceptToDocument_A_fkey" FOREIGN KEY ("A") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConceptToDocument" ADD CONSTRAINT "_ConceptToDocument_B_fkey" FOREIGN KEY ("B") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
