/*
  Warnings:

  - You are about to drop the column `titles` on the `Journal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Journal" DROP COLUMN "titles",
ADD COLUMN     "title" TEXT;
