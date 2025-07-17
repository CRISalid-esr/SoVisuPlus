-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('ADD', 'REMOVE', 'UPDATE');

-- CreateEnum
CREATE TYPE "ActionTargetType" AS ENUM ('DOCUMENT');

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "targetType" "ActionTargetType" NOT NULL,
    "targetUid" TEXT NOT NULL,
    "path" TEXT,
    "parameters" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatched" BOOLEAN NOT NULL DEFAULT false,
    "personUid" TEXT NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Action_actionType_idx" ON "Action"("actionType");

-- CreateIndex
CREATE INDEX "Action_targetType_idx" ON "Action"("targetType");

-- CreateIndex
CREATE INDEX "Action_targetUid_idx" ON "Action"("targetUid");

-- CreateIndex
CREATE INDEX "Action_timestamp_idx" ON "Action"("timestamp");
