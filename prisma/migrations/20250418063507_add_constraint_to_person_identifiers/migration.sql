/*
  Warnings:

  - A unique constraint covering the columns `[personId,type]` on the table `PersonIdentifier` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PersonIdentifier_personId_type_key" ON "PersonIdentifier"("personId", "type");
