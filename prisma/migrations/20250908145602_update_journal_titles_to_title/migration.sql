/*
  Warnings:

  - You are about to drop the column `titles` on the `Journal` table. All the data in the column will be lost.
  - Added the required column `title` to the `Journal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Journal" ADD "title" TEXT;

UPDATE "Journal" SET "title" = (SELECT "titles"[1] FROM "Journal");

ALTER TABLE "Journal" ALTER COLUMN "title" SET NOT NULL;

ALTER TABLE "Journal" DROP COLUMN "titles";