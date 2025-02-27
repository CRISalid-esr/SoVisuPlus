/*
  Warnings:

  - A unique constraint covering the columns `[conceptId,language,type,value]` on the table `ConceptLabel` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ConceptLabel_conceptId_language_type_key";

-- CreateIndex
CREATE UNIQUE INDEX "ConceptLabel_conceptId_language_type_value_key" ON "ConceptLabel"("conceptId", "language", "type", "value");
