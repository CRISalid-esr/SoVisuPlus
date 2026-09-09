-- CreateEnum
CREATE TYPE "SourcePersonIdentifierType" AS ENUM ('openalex', 'idref', 'orcid', 'idhals', 'idhali', 'isni', 'viaf', 'googlescholar', 'researcherid');

-- AlterTable
ALTER TABLE "SourcePerson" ADD COLUMN     "personId" INTEGER;

-- CreateTable
CREATE TABLE "SourcePersonIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "SourcePersonIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SourcePersonIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SourcePersonToSourcePersonIdentifier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SourcePersonToSourcePersonIdentifier_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcePersonIdentifier_type_value_key" ON "SourcePersonIdentifier"("type", "value");

-- CreateIndex
CREATE INDEX "_SourcePersonToSourcePersonIdentifier_B_index" ON "_SourcePersonToSourcePersonIdentifier"("B");

-- AddForeignKey
ALTER TABLE "SourcePerson" ADD CONSTRAINT "SourcePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SourcePersonToSourcePersonIdentifier" ADD CONSTRAINT "_SourcePersonToSourcePersonIdentifier_A_fkey" FOREIGN KEY ("A") REFERENCES "SourcePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SourcePersonToSourcePersonIdentifier" ADD CONSTRAINT "_SourcePersonToSourcePersonIdentifier_B_fkey" FOREIGN KEY ("B") REFERENCES "SourcePersonIdentifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

