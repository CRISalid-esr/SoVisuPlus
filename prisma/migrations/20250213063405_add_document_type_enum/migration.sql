-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('Document', 'ScholarlyPublication', 'JournalArticle', 'Book', 'Monograph', 'BookChapter', 'ConferenceArticle', 'Proceedings');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "documentType" "DocumentType" NOT NULL DEFAULT 'Document';
