-- CreateEnum
CREATE TYPE "SourcePersonIdentifierType" AS ENUM ('openalex', 'idref', 'orcid', 'idhals', 'idhali', 'isni', 'viaf', 'googlescholar', 'researcherid');

-- AlterTable
ALTER TABLE "SourcePerson" ADD COLUMN     "personId" INTEGER;

-- CreateTable
CREATE TABLE "SourcePersonIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "SourcePersonIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "sourcePersonId" INTEGER NOT NULL,

    CONSTRAINT "SourcePersonIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcePersonIdentifier_type_value_key" ON "SourcePersonIdentifier"("type", "value");

-- AddForeignKey
ALTER TABLE "SourcePerson" ADD CONSTRAINT "SourcePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcePersonIdentifier" ADD CONSTRAINT "SourcePersonIdentifier_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "SourcePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

