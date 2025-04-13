-- AlterTable
ALTER TABLE "_ConceptToDocument" ADD CONSTRAINT "_ConceptToDocument_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ConceptToDocument_AB_unique";
