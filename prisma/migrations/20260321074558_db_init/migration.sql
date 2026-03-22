-- CreateEnum
CREATE TYPE "DocumentState" AS ENUM ('default', 'waiting_for_update');

-- CreateEnum
CREATE TYPE "OAStatus" AS ENUM ('green', 'diamond', 'gold', 'bronze', 'hybrid', 'other', 'closed');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('Document', 'ScholarlyPublication', 'Presentation', 'Article', 'ConferenceAbstract', 'Preface', 'Comment', 'JournalArticle', 'Book', 'Monograph', 'BookChapter', 'BookOfChapters', 'ConferenceArticle', 'Proceedings');

-- CreateEnum
CREATE TYPE "SourceRecordType" AS ENUM ('Article', 'AudiovisualDocument', 'Book', 'Chapter', 'Document', 'Excerpt', 'Letter', 'Manual', 'Map', 'Note', 'Patent', 'Proceedings', 'Standard', 'Thesis', 'BlogPost', 'ConferenceOutput', 'DataPaper', 'Lecture', 'MasterThesis', 'Other', 'PeerReview', 'Report', 'ResearchReport', 'Software', 'TechnicalReport', 'BookReview', 'ConferencePaper', 'ConferencePoster', 'DataManagementPlan', 'Dataset', 'Editorial', 'Erratum', 'Image', 'MetadataDocument', 'Preprint', 'ReferenceBook', 'ReviewArticle', 'ReviewPaper', 'StillImage', 'WorkingPaper', 'Grant', 'Work', 'Unknown');

-- CreateEnum
CREATE TYPE "HalSubmitType" AS ENUM ('file', 'notice', 'annex');

-- CreateEnum
CREATE TYPE "PublicationIdentifierType" AS ENUM ('arxiv', 'bibcode', 'biorxiv', 'cern', 'chemrxiv', 'doi', 'ensam', 'hal', 'ineris', 'inspire', 'ird', 'irstea', 'irthesaurus', 'meditagri', 'nnt', 'oatao', 'okina', 'openalex', 'pii', 'pmid', 'ppn', 'prodinra', 'pubmedcentral', 'sciencespo', 'swhid', 'uri', 'wos', 'unknown');

-- CreateEnum
CREATE TYPE "BibliographicPlatform" AS ENUM ('hal', 'scanr', 'idref', 'openalex', 'scopus');

-- CreateEnum
CREATE TYPE "AuthorityOrganizationIdentifierType" AS ENUM ('hal', 'idref', 'isni', 'local', 'nns', 'openalex', 'ror', 'scopus', 'siren', 'siret', 'uai', 'viaf', 'wikidata');

-- CreateEnum
CREATE TYPE "LabelType" AS ENUM ('PREF', 'ALT');

-- CreateEnum
CREATE TYPE "PersonIdentifierType" AS ENUM ('eppn', 'hal_login', 'idref', 'idhals', 'idhali', 'local', 'orcid', 'scopus');

-- CreateEnum
CREATE TYPE "ResearchUnitIdentifierType" AS ENUM ('hal', 'idref', 'isni', 'local', 'nns', 'openalex', 'ror', 'scopus', 'siren', 'siret', 'uai', 'viaf', 'wikidata');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('ADD', 'REMOVE', 'UPDATE', 'FETCH', 'MERGE');

-- CreateEnum
CREATE TYPE "ActionTargetType" AS ENUM ('DOCUMENT', 'PERSON', 'HARVESTING');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('manage', 'read', 'create', 'update', 'delete', 'merge', 'unmerge', 'fetch_documents');

-- CreateEnum
CREATE TYPE "PermissionSubject" AS ENUM ('all', 'Document', 'DocumentRecord', 'Person', 'ResearchUnit', 'Membership', 'Institution', 'InstitutionDivision');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('Person', 'ResearchUnit', 'Institution', 'InstitutionDivision');

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
    "slug" TEXT,
    "email" TEXT,
    "displayName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "normalizedName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "external" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "researchUnitId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "positionCode" TEXT,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'Document',
    "oaStatus" "OAStatus",
    "publicationDate" TEXT,
    "publicationDateStart" TIMESTAMP(3),
    "publicationDateEnd" TIMESTAMP(3),
    "upwOAStatus" "OAStatus",
    "title_locale_0" TEXT,
    "title_locale_1" TEXT,
    "title_locale_2" TEXT,
    "state" "DocumentState" NOT NULL DEFAULT 'default',
    "journalId" INTEGER,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" SERIAL NOT NULL,
    "issnL" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalIdentifier" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "format" TEXT,
    "journalId" INTEGER NOT NULL,

    CONSTRAINT "JournalIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcePerson" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,

    CONSTRAINT "SourcePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceContribution" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "sourcePersonId" INTEGER NOT NULL,
    "documentRecordId" INTEGER NOT NULL,

    CONSTRAINT "SourceContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceJournal" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "publisher" TEXT,
    "titles" TEXT[],

    CONSTRAINT "SourceJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "PublicationIdentifierType" NOT NULL,
    "value" TEXT,

    CONSTRAINT "PublicationIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "url" TEXT,
    "sourceIdentifier" TEXT NOT NULL,
    "documentTypes" "SourceRecordType"[],
    "sourceJournalId" INTEGER,
    "publicationDate" TIMESTAMP(3),
    "platform" "BibliographicPlatform" NOT NULL,
    "titles" JSONB NOT NULL,
    "halCollectionCodes" TEXT[],
    "halSubmitType" "HalSubmitType",
    "documentId" INTEGER NOT NULL,

    CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "AuthorityOrganizationIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "AuthorityOrganizationIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "AuthorityOrganizationIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorityOrganization" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "displayNames" TEXT[],

    CONSTRAINT "AuthorityOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "roles" TEXT[],

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "uri" TEXT,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptLabel" (
    "id" SERIAL NOT NULL,
    "conceptId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "LabelType" NOT NULL,

    CONSTRAINT "ConceptLabel_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "OrcidIdentifier" (
    "id" INTEGER NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "scope" TEXT NOT NULL,
    "tokenType" TEXT,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcidIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUnit" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "acronym" TEXT,
    "signature" TEXT,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,

    CONSTRAINT "ResearchUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUnitName" (
    "id" SERIAL NOT NULL,
    "researchUnitId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    CONSTRAINT "ResearchUnitName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUnitDescription" (
    "id" SERIAL NOT NULL,
    "researchUnitId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "value" VARCHAR(2000) NOT NULL,

    CONSTRAINT "ResearchUnitDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchUnitIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "ResearchUnitIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "researchUnitId" INTEGER NOT NULL,

    CONSTRAINT "ResearchUnitIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "targetType" "ActionTargetType" NOT NULL,
    "targetUid" TEXT NOT NULL,
    "path" TEXT,
    "parameters" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatched" BOOLEAN NOT NULL DEFAULT false,
    "personUid" TEXT NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "subject" "PermissionSubject" NOT NULL,
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inverted" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "UserRoleScope" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityUid" TEXT NOT NULL,

    CONSTRAINT "UserRoleScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DocumentRecordToPublicationIdentifier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DocumentRecordToPublicationIdentifier_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AuthorityOrganizationToContribution" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AuthorityOrganizationToContribution_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ConceptToDocument" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ConceptToDocument_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_uid_key" ON "Person"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Membership_researchUnitId_idx" ON "Membership"("researchUnitId");

-- CreateIndex
CREATE INDEX "Membership_personId_idx" ON "Membership"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_personId_researchUnitId_key" ON "Membership"("personId", "researchUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_uid_key" ON "Document"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_issnL_key" ON "Journal"("issnL");

-- CreateIndex
CREATE UNIQUE INDEX "SourcePerson_uid_key" ON "SourcePerson"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "SourceJournal_uid_key" ON "SourceJournal"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationIdentifier_type_value_key" ON "PublicationIdentifier"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRecord_uid_key" ON "DocumentRecord"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTitle_documentId_language_key" ON "DocumentTitle"("documentId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAbstract_documentId_language_key" ON "DocumentAbstract"("documentId", "language");

-- CreateIndex
CREATE INDEX "AuthorityOrganizationIdentifier_organizationId_idx" ON "AuthorityOrganizationIdentifier"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityOrganizationIdentifier_type_value_key" ON "AuthorityOrganizationIdentifier"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityOrganization_uid_key" ON "AuthorityOrganization"("uid");

-- CreateIndex
CREATE INDEX "Contribution_documentId_idx" ON "Contribution"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_personId_documentId_key" ON "Contribution"("personId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_uid_key" ON "Concept"("uid");

-- CreateIndex
CREATE INDEX "ConceptLabel_conceptId_idx" ON "ConceptLabel"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptLabel_conceptId_language_type_value_key" ON "ConceptLabel"("conceptId", "language", "type", "value");

-- CreateIndex
CREATE INDEX "PersonIdentifier_personId_idx" ON "PersonIdentifier"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonIdentifier_type_value_key" ON "PersonIdentifier"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "PersonIdentifier_personId_type_key" ON "PersonIdentifier"("personId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnit_uid_key" ON "ResearchUnit"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnit_slug_key" ON "ResearchUnit"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnitName_researchUnitId_language_key" ON "ResearchUnitName"("researchUnitId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnitDescription_researchUnitId_language_key" ON "ResearchUnitDescription"("researchUnitId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUnitIdentifier_type_value_key" ON "ResearchUnitIdentifier"("type", "value");

-- CreateIndex
CREATE INDEX "Action_actionType_idx" ON "Action"("actionType");

-- CreateIndex
CREATE INDEX "Action_targetType_idx" ON "Action"("targetType");

-- CreateIndex
CREATE INDEX "Action_targetUid_idx" ON "Action"("targetUid");

-- CreateIndex
CREATE INDEX "Action_timestamp_idx" ON "Action"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRoleScope_entityType_entityUid_idx" ON "UserRoleScope"("entityType", "entityUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleScope_userId_roleId_entityType_entityUid_key" ON "UserRoleScope"("userId", "roleId", "entityType", "entityUid");

-- CreateIndex
CREATE INDEX "_DocumentRecordToPublicationIdentifier_B_index" ON "_DocumentRecordToPublicationIdentifier"("B");

-- CreateIndex
CREATE INDEX "_AuthorityOrganizationToContribution_B_index" ON "_AuthorityOrganizationToContribution"("B");

-- CreateIndex
CREATE INDEX "_ConceptToDocument_B_index" ON "_ConceptToDocument"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalIdentifier" ADD CONSTRAINT "JournalIdentifier_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceContribution" ADD CONSTRAINT "SourceContribution_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "SourcePerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceContribution" ADD CONSTRAINT "SourceContribution_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "DocumentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_sourceJournalId_fkey" FOREIGN KEY ("sourceJournalId") REFERENCES "SourceJournal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTitle" ADD CONSTRAINT "DocumentTitle_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAbstract" ADD CONSTRAINT "DocumentAbstract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityOrganizationIdentifier" ADD CONSTRAINT "AuthorityOrganizationIdentifier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "AuthorityOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptLabel" ADD CONSTRAINT "ConceptLabel_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonIdentifier" ADD CONSTRAINT "PersonIdentifier_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcidIdentifier" ADD CONSTRAINT "OrcidIdentifier_id_fkey" FOREIGN KEY ("id") REFERENCES "PersonIdentifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUnitName" ADD CONSTRAINT "ResearchUnitName_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUnitDescription" ADD CONSTRAINT "ResearchUnitDescription_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchUnitIdentifier" ADD CONSTRAINT "ResearchUnitIdentifier_researchUnitId_fkey" FOREIGN KEY ("researchUnitId") REFERENCES "ResearchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleScope" ADD CONSTRAINT "UserRoleScope_userId_roleId_fkey" FOREIGN KEY ("userId", "roleId") REFERENCES "UserRole"("userId", "roleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentRecordToPublicationIdentifier" ADD CONSTRAINT "_DocumentRecordToPublicationIdentifier_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentRecordToPublicationIdentifier" ADD CONSTRAINT "_DocumentRecordToPublicationIdentifier_B_fkey" FOREIGN KEY ("B") REFERENCES "PublicationIdentifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthorityOrganizationToContribution" ADD CONSTRAINT "_AuthorityOrganizationToContribution_A_fkey" FOREIGN KEY ("A") REFERENCES "AuthorityOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthorityOrganizationToContribution" ADD CONSTRAINT "_AuthorityOrganizationToContribution_B_fkey" FOREIGN KEY ("B") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConceptToDocument" ADD CONSTRAINT "_ConceptToDocument_A_fkey" FOREIGN KEY ("A") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConceptToDocument" ADD CONSTRAINT "_ConceptToDocument_B_fkey" FOREIGN KEY ("B") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
