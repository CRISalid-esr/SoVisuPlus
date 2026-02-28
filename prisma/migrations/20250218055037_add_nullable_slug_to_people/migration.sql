/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Person` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");
