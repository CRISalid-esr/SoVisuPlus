-- CreateEnum
CREATE TYPE "public"."DocumentState" AS ENUM ('default', 'waiting_for_update');

-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "state" "public"."DocumentState" NOT NULL DEFAULT 'default';
