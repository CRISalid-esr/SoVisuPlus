-- CreateTable
CREATE TABLE "AuthorityOrganization" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "displayNames" TEXT[],

    CONSTRAINT "AuthorityOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AuthorityOrganizationToContribution" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AuthorityOrganizationToContribution_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityOrganization_uid_key" ON "AuthorityOrganization"("uid");

-- CreateIndex
CREATE INDEX "_AuthorityOrganizationToContribution_B_index" ON "_AuthorityOrganizationToContribution"("B");

-- AddForeignKey
ALTER TABLE "_AuthorityOrganizationToContribution" ADD CONSTRAINT "_AuthorityOrganizationToContribution_A_fkey" FOREIGN KEY ("A") REFERENCES "AuthorityOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthorityOrganizationToContribution" ADD CONSTRAINT "_AuthorityOrganizationToContribution_B_fkey" FOREIGN KEY ("B") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
