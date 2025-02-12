/*
  Warnings:

  - You are about to drop the column `harvester` on the `DocumentRecord` table. All the data in the column will be lost.
  - Added the required column `platform` to the `DocumentRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentRecord" DROP COLUMN "harvester",
ADD COLUMN     "platform" "BibliographicPlatform" NOT NULL;
