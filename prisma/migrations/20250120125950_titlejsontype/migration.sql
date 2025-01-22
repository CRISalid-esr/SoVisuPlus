/*
  Warnings:

  - Changed the type of `titles` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "titles",
ADD COLUMN     "titles" JSONB NOT NULL;
