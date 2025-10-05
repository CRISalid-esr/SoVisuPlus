/*
  Warnings:

  - The values [manageMemberships] on the enum `PermissionAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PermissionAction_new" AS ENUM ('manage', 'read', 'create', 'update', 'delete', 'merge');
ALTER TABLE "public"."Permission" ALTER COLUMN "action" TYPE "public"."PermissionAction_new" USING ("action"::text::"public"."PermissionAction_new");
ALTER TYPE "public"."PermissionAction" RENAME TO "PermissionAction_old";
ALTER TYPE "public"."PermissionAction_new" RENAME TO "PermissionAction";
DROP TYPE "public"."PermissionAction_old";
COMMIT;

-- AlterEnum
ALTER TYPE "public"."PermissionSubject" ADD VALUE 'Membership';
