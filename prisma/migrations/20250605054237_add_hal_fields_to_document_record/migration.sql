-- CreateEnum
CREATE TYPE "HalSubmitType" AS ENUM ('file', 'notice', 'annex');

-- AlterTable
ALTER TABLE "DocumentRecord" ADD COLUMN     "halCollectionCodes" TEXT[],
ADD COLUMN     "halSubmitType" "HalSubmitType";
