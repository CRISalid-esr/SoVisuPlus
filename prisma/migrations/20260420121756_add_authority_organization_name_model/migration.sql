-- CreateEnum
CREATE TYPE "AuthorityOrganizationNameType" AS ENUM ('authority_organization_state_name');

-- CreateTable
CREATE TABLE "AuthorityOrganizationName" (
    "id" SERIAL NOT NULL,
    "type" "AuthorityOrganizationNameType" NOT NULL,
    "language" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "AuthorityOrganizationName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityOrganizationName_language_value_organizationId_key" ON "AuthorityOrganizationName"("language", "value", "organizationId");

-- AddForeignKey
ALTER TABLE "AuthorityOrganizationName" ADD CONSTRAINT "AuthorityOrganizationName_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "AuthorityOrganization"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
