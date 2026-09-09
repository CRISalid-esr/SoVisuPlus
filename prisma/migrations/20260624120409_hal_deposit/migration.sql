-- CreateEnum
CREATE TYPE "HalDepositStatus" AS ENUM ('pending', 'running', 'accept', 'verify', 'update', 'delete', 'replace', 'error');

-- AlterEnum
ALTER TYPE "PermissionAction" ADD VALUE 'deposit_hal';

-- CreateTable
CREATE TABLE "HalDeposit" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "status" "HalDepositStatus" NOT NULL DEFAULT 'pending',
    "halId" TEXT,
    "halPassword" TEXT,
    "halVersion" INTEGER,
    "halUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "comment" TEXT,
    "refreshRequestedAt" TIMESTAMP(3),
    "halDocumentType" TEXT NOT NULL,
    "halDomains" TEXT[],
    "language" TEXT NOT NULL,
    "conferenceTitle" TEXT,
    "conferenceCity" TEXT,
    "conferenceCountry" TEXT,
    "institution" TEXT,
    "bookTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HalDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HalDepositFile" (
    "id" SERIAL NOT NULL,
    "halDepositId" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "mimeType" TEXT NOT NULL,
    "fileSource" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HalDepositFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HalDeposit_status_idx" ON "HalDeposit"("status");

-- CreateIndex
CREATE INDEX "HalDeposit_refreshRequestedAt_idx" ON "HalDeposit"("refreshRequestedAt");

-- AddForeignKey
ALTER TABLE "HalDeposit" ADD CONSTRAINT "HalDeposit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HalDeposit" ADD CONSTRAINT "HalDeposit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HalDepositFile" ADD CONSTRAINT "HalDepositFile_halDepositId_fkey" FOREIGN KEY ("halDepositId") REFERENCES "HalDeposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

