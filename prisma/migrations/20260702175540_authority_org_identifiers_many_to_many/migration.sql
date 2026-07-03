-- CreateTable
CREATE TABLE "_AuthorityOrganizationToAuthorityOrganizationIdentifier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AuthorityOrganizationToAuthorityOrganizationIdentifier_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AuthorityOrganizationToAuthorityOrganizationIdentifier_B_index" ON "_AuthorityOrganizationToAuthorityOrganizationIdentifier"("B");

-- AddForeignKey
ALTER TABLE "_AuthorityOrganizationToAuthorityOrganizationIdentifier" ADD CONSTRAINT "_AuthorityOrganizationToAuthorityOrganizationIdentifier_A_fkey" FOREIGN KEY ("A") REFERENCES "AuthorityOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthorityOrganizationToAuthorityOrganizationIdentifier" ADD CONSTRAINT "_AuthorityOrganizationToAuthorityOrganizationIdentifier_B_fkey" FOREIGN KEY ("B") REFERENCES "AuthorityOrganizationIdentifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the join table from the existing one-to-many `organizationId` links so current
-- affiliations survive the switch to many-to-many (must run before the column is dropped).
INSERT INTO "_AuthorityOrganizationToAuthorityOrganizationIdentifier" ("A", "B")
SELECT "organizationId", "id" FROM "AuthorityOrganizationIdentifier";

-- DropForeignKey
ALTER TABLE "public"."AuthorityOrganizationIdentifier" DROP CONSTRAINT "AuthorityOrganizationIdentifier_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."AuthorityOrganizationIdentifier_organizationId_idx";

-- AlterTable
ALTER TABLE "AuthorityOrganizationIdentifier" DROP COLUMN "organizationId";
