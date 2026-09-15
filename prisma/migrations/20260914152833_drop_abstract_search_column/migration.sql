/*
  Warnings:

  - You are about to drop the column `normalizedValue` on the `DocumentAbstract` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DocumentAbstract_normalizedValue_idx";

-- AlterTable
ALTER TABLE "DocumentAbstract" DROP COLUMN "normalizedValue";
