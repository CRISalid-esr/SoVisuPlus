-- CreateEnum
CREATE TYPE "LabelType" AS ENUM ('PREF', 'ALT');

-- CreateTable
CREATE TABLE "Concept" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "uri" TEXT,
    "documentId" INTEGER,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptLabel" (
    "id" SERIAL NOT NULL,
    "conceptId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "LabelType" NOT NULL,

    CONSTRAINT "ConceptLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Concept_uid_key" ON "Concept"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptLabel_conceptId_language_type_key" ON "ConceptLabel"("conceptId", "language", "type");

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptLabel" ADD CONSTRAINT "ConceptLabel_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
