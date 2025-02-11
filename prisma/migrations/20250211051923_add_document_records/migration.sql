-- CreateEnum
CREATE TYPE "BibliographicPlatform" AS ENUM ('HAL', 'SCANR', 'IDREF', 'OPENALEX', 'SCOPUS');

-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "harvester" "BibliographicPlatform" NOT NULL,
    "titles" JSONB NOT NULL,
    "documentId" INTEGER NOT NULL,

    CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRecord_uid_key" ON "DocumentRecord"("uid");

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
