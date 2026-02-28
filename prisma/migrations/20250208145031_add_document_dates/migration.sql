-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "publicationDate" TEXT,
ADD COLUMN     "publicationDateEnd" TIMESTAMP(3),
ADD COLUMN     "publicationDateStart" TIMESTAMP(3);
