-- AlterTable
ALTER TABLE "DocumentRecord" ADD COLUMN     "documentTypes" "DocumentType"[],
ADD COLUMN     "publicationDate" TIMESTAMP(3),
ADD COLUMN     "sourceJournalId" INTEGER;

-- CreateTable
CREATE TABLE "SourcePerson" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "SourcePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceContribution" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "sourcePersonId" INTEGER NOT NULL,
    "documentRecordId" INTEGER NOT NULL,

    CONSTRAINT "SourceContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceJournal" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "SourceJournal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcePerson_uid_key" ON "SourcePerson"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "SourceJournal_uid_key" ON "SourceJournal"("uid");

-- AddForeignKey
ALTER TABLE "SourceContribution" ADD CONSTRAINT "SourceContribution_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "SourcePerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceContribution" ADD CONSTRAINT "SourceContribution_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "DocumentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_sourceJournalId_fkey" FOREIGN KEY ("sourceJournalId") REFERENCES "SourceJournal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
