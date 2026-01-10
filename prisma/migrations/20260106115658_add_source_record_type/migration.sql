/*
  Warnings:

  - The `documentTypes` column on the `DocumentRecord` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SourceRecordType" AS ENUM ('Article', 'AudiovisualDocument', 'Book', 'Chapter', 'Document', 'Excerpt', 'Letter', 'Manual', 'Map', 'Note', 'Patent', 'Proceedings', 'Standard', 'Thesis', 'BlogPost', 'ConferenceOutput', 'DataPaper', 'Lecture', 'MasterThesis', 'Other', 'PeerReview', 'Report', 'ResearchReport', 'Software', 'TechnicalReport', 'BookReview', 'ConferencePaper', 'ConferencePoster', 'DataManagementPlan', 'Dataset', 'Editorial', 'Erratum', 'Image', 'MetadataDocument', 'Preprint', 'ReferenceBook', 'ReviewArticle', 'ReviewPaper', 'StillImage', 'WorkingPaper', 'Grant', 'Work');

-- AlterTable
ALTER TABLE "DocumentRecord" DROP COLUMN "documentTypes",
ADD COLUMN     "documentTypes" "SourceRecordType"[];
