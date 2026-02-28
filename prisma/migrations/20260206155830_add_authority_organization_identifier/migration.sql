-- CreateTable
CREATE TABLE "AuthorityOrganizationIdentifier" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "AuthorityOrganizationIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorityOrganizationIdentifier_organizationId_idx" ON "AuthorityOrganizationIdentifier"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityOrganizationIdentifier_type_value_key" ON "AuthorityOrganizationIdentifier"("type", "value");

-- AddForeignKey
ALTER TABLE "AuthorityOrganizationIdentifier" ADD CONSTRAINT "AuthorityOrganizationIdentifier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "AuthorityOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
