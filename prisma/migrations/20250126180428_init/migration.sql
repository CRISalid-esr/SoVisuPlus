-- CreateEnum
CREATE TYPE "ContributionRole" AS ENUM ('actor', 'adapter', 'artist', 'author', 'author_of_introduction', 'builder', 'binder', 'commentator', 'compiler', 'contributor', 'conductor', 'creator', 'debater', 'dancer', 'director', 'designer', 'editor', 'enforcer', 'engraver', 'executive_producer', 'funder', 'grader', 'illustrator', 'laborator', 'lender', 'librarian', 'manager', 'operator', 'organizer', 'performer', 'party', 'patron', 'recorded_by', 'reader', 'receptor', 'reception', 'scorer', 'scriptwriter', 'spokesperson', 'session_creator', 'transcriber', 'translator', 'video_producer');

-- CreateEnum
CREATE TYPE "PersonIdentifierType" AS ENUM ('orcid', 'idref', 'id_hal_s', 'id_hal_i', 'scopus_eid', 'local');

-- CreateEnum
CREATE TYPE "ResearchStructureIdentifierType" AS ENUM ('local', 'rnsr', 'idref', 'ror');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "external" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTitle" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(2000) NOT NULL,

    CONSTRAINT "DocumentTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAbstract" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "DocumentAbstract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "role" "ContributionRole" NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "PersonIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "personId" INTEGER NOT NULL,

    CONSTRAINT "PersonIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchStructure" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "acronym" TEXT,

    CONSTRAINT "ResearchStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchStructureName" (
    "id" SERIAL NOT NULL,
    "researchStructureId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    CONSTRAINT "ResearchStructureName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchStructureDescription" (
    "id" SERIAL NOT NULL,
    "researchStructureId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(2000) NOT NULL,

    CONSTRAINT "ResearchStructureDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchStructureIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "ResearchStructureIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "researchStructureId" INTEGER NOT NULL,

    CONSTRAINT "ResearchStructureIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_uid_key" ON "Person"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Document_uid_key" ON "Document"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTitle_documentId_language_key" ON "DocumentTitle"("documentId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAbstract_documentId_language_key" ON "DocumentAbstract"("documentId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_personId_documentId_role_key" ON "Contribution"("personId", "documentId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PersonIdentifier_type_value_key" ON "PersonIdentifier"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStructure_uid_key" ON "ResearchStructure"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStructureName_researchStructureId_language_key" ON "ResearchStructureName"("researchStructureId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStructureDescription_researchStructureId_language_key" ON "ResearchStructureDescription"("researchStructureId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStructureIdentifier_type_value_key" ON "ResearchStructureIdentifier"("type", "value");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTitle" ADD CONSTRAINT "DocumentTitle_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAbstract" ADD CONSTRAINT "DocumentAbstract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonIdentifier" ADD CONSTRAINT "PersonIdentifier_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchStructureName" ADD CONSTRAINT "ResearchStructureName_researchStructureId_fkey" FOREIGN KEY ("researchStructureId") REFERENCES "ResearchStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchStructureDescription" ADD CONSTRAINT "ResearchStructureDescription_researchStructureId_fkey" FOREIGN KEY ("researchStructureId") REFERENCES "ResearchStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchStructureIdentifier" ADD CONSTRAINT "ResearchStructureIdentifier_researchStructureId_fkey" FOREIGN KEY ("researchStructureId") REFERENCES "ResearchStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
