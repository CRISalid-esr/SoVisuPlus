/*
  Warnings:

  - You are about to drop the `Publication` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ContributionRole" AS ENUM ('actor', 'adapter', 'artist', 'author', 'author_of_introduction', 'builder', 'binder', 'commentator', 'compiler', 'contributor', 'conductor', 'creator', 'debater', 'dancer', 'director', 'designer', 'editor', 'enforcer', 'engraver', 'executive_producer', 'funder', 'grader', 'illustrator', 'laborator', 'lender', 'librarian', 'manager', 'operator', 'organizer', 'performer', 'party', 'patron', 'recorded_by', 'reader', 'receptor', 'reception', 'scorer', 'scriptwriter', 'spokesperson', 'session_creator', 'transcriber', 'translator', 'video_producer');

-- DropTable
DROP TABLE "Publication";

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "titles" TEXT[],

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "role" "ContributionRole" NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_uid_key" ON "Document"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_personId_documentId_role_key" ON "Contribution"("personId", "documentId", "role");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
