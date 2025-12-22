-- DropForeignKey
ALTER TABLE "public"."SourceContribution" DROP CONSTRAINT "SourceContribution_documentRecordId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SourceContribution" DROP CONSTRAINT "SourceContribution_sourcePersonId_fkey";

-- AddForeignKey
ALTER TABLE "SourceContribution" ADD CONSTRAINT "SourceContribution_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "SourcePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceContribution" ADD CONSTRAINT "SourceContribution_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "DocumentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
