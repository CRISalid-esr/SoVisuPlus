-- CreateTable
CREATE TABLE "OrcidIdentifier" (
    "id" INTEGER NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "scope" TEXT,
    "tokenType" TEXT,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcidIdentifier_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrcidIdentifier" ADD CONSTRAINT "OrcidIdentifier_id_fkey" FOREIGN KEY ("id") REFERENCES "PersonIdentifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
