-- CreateTable
CREATE TABLE "KeycloakSession" (
    "sid" TEXT NOT NULL,
    "userId" INTEGER,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" INTEGER NOT NULL,
    "refreshTokenExpiresAt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeycloakSession_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "KeycloakSession_refreshTokenExpiresAt_idx" ON "KeycloakSession"("refreshTokenExpiresAt");
