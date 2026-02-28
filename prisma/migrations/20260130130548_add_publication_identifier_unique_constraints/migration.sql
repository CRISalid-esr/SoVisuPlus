/*
  Warnings:

  - A unique constraint covering the columns `[type,value]` on the table `PublicationIdentifier` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentRecordId,type]` on the table `PublicationIdentifier` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "PublicationIdentifier_documentRecordId_idx" ON "PublicationIdentifier"("documentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationIdentifier_type_value_key" ON "PublicationIdentifier"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationIdentifier_documentRecordId_type_key" ON "PublicationIdentifier"("documentRecordId", "type");
