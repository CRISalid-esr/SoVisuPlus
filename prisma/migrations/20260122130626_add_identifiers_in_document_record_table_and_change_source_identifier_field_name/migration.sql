/*
  Warnings:

  - You are about to drop the column `identifier` on the `DocumentRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DocumentRecord" DROP COLUMN "identifier",
ADD COLUMN     "sourceIdentifier" TEXT;

-- CreateTable
CREATE TABLE "PublicationIdentifier" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT,
    "documentRecordId" INTEGER NOT NULL,

    CONSTRAINT "PublicationIdentifier_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PublicationIdentifier" ADD CONSTRAINT "PublicationIdentifier_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "DocumentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
