/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `ResearchStructure` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ResearchStructure" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStructure_slug_key" ON "ResearchStructure"("slug");
