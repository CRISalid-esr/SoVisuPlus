-- CreateEnum
CREATE TYPE "ChangeAction" AS ENUM ('ADD', 'REMOVE', 'UPDATE');

-- CreateEnum
CREATE TYPE "ChangeTargetType" AS ENUM ('DOCUMENT');

-- CreateTable
CREATE TABLE "Change" (
    "id" TEXT NOT NULL,
    "action" "ChangeAction" NOT NULL,
    "targetType" "ChangeTargetType" NOT NULL,
    "targetUid" TEXT NOT NULL,
    "path" TEXT,
    "parameters" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Change_action_idx" ON "Change"("action");

-- CreateIndex
CREATE INDEX "Change_targetType_idx" ON "Change"("targetType");

-- CreateIndex
CREATE INDEX "Change_targetUid_idx" ON "Change"("targetUid");

-- CreateIndex
CREATE INDEX "Change_timestamp_idx" ON "Change"("timestamp");
