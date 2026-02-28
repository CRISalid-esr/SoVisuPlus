/*
  Warnings:

  - You are about to drop the column `role` on the `Contribution` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[personId,documentId]` on the table `Contribution` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Contribution_personId_documentId_role_key";

-- AlterTable
ALTER TABLE "Contribution" DROP COLUMN "role",
ADD COLUMN     "roles" TEXT[];

-- DropEnum
DROP TYPE "ContributionRole";

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_personId_documentId_key" ON "Contribution"("personId", "documentId");
