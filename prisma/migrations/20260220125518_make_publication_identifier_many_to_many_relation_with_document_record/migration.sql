/*
  Warnings:

  - You are about to drop the column `documentRecordId` on the `PublicationIdentifier` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PublicationIdentifier" DROP CONSTRAINT "PublicationIdentifier_documentRecordId_fkey";

-- DropIndex
DROP INDEX "public"."PublicationIdentifier_documentRecordId_idx";

-- DropIndex
DROP INDEX "public"."PublicationIdentifier_documentRecordId_type_key";

-- AlterTable
ALTER TABLE "PublicationIdentifier" DROP COLUMN "documentRecordId";

-- CreateTable
CREATE TABLE "_DocumentRecordToPublicationIdentifier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DocumentRecordToPublicationIdentifier_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DocumentRecordToPublicationIdentifier_B_index" ON "_DocumentRecordToPublicationIdentifier"("B");

-- AddForeignKey
ALTER TABLE "_DocumentRecordToPublicationIdentifier" ADD CONSTRAINT "_DocumentRecordToPublicationIdentifier_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentRecordToPublicationIdentifier" ADD CONSTRAINT "_DocumentRecordToPublicationIdentifier_B_fkey" FOREIGN KEY ("B") REFERENCES "PublicationIdentifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
