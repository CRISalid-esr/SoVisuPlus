-- CreateEnum
CREATE TYPE "OAStatus" AS ENUM ('green', 'diamond', 'gold', 'bronze', 'hybrid', 'other', 'closed');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "oaStatus" "OAStatus",
ADD COLUMN     "upwOAStatus" "OAStatus";
