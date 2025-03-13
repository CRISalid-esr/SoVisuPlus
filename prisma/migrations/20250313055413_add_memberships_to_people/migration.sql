-- CreateTable
CREATE TABLE "Membership" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "researchStructureId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "positionCode" TEXT,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_researchStructureId_idx" ON "Membership"("researchStructureId");

-- CreateIndex
CREATE INDEX "Membership_personId_idx" ON "Membership"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_personId_researchStructureId_key" ON "Membership"("personId", "researchStructureId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_researchStructureId_fkey" FOREIGN KEY ("researchStructureId") REFERENCES "ResearchStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
