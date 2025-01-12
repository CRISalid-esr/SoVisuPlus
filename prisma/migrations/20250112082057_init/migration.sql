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
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "external" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "titles" TEXT[],

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
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
    "names" JSONB NOT NULL,
    "descriptions" JSONB NOT NULL,

    CONSTRAINT "ResearchStructure_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Publication_uid_key" ON "Publication"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "PersonIdentifier_type_value_key" ON "PersonIdentifier"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStructure_uid_key" ON "ResearchStructure"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStructureIdentifier_type_value_key" ON "ResearchStructureIdentifier"("type", "value");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonIdentifier" ADD CONSTRAINT "PersonIdentifier_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchStructureIdentifier" ADD CONSTRAINT "ResearchStructureIdentifier_researchStructureId_fkey" FOREIGN KEY ("researchStructureId") REFERENCES "ResearchStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
