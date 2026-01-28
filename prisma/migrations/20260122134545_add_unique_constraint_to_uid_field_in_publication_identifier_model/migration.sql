/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `PublicationIdentifier` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PublicationIdentifier_uid_key" ON "PublicationIdentifier"("uid");
