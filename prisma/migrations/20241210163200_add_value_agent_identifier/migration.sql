-- CreateEnum
CREATE TYPE "AgentIdentifierType" AS ENUM ('ORCID', 'ID_REF', 'ID_HAL', 'SCOPUSEID');

-- CreateTable
CREATE TABLE "AgentIdentifier" (
    "id" SERIAL NOT NULL,
    "type" "AgentIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "AgentIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentIdentifier_value_key" ON "AgentIdentifier"("value");

-- AddForeignKey
ALTER TABLE "AgentIdentifier" ADD CONSTRAINT "AgentIdentifier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
