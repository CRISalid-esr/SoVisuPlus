-- CreateEnum
CREATE TYPE "public"."PermissionAction" AS ENUM ('manage', 'read', 'create', 'update', 'delete', 'merge', 'manageMemberships');

-- CreateEnum
CREATE TYPE "public"."PermissionSubject" AS ENUM ('all', 'Document', 'Person', 'ResearchStructure', 'Institution', 'InstitutionDivision');

-- CreateEnum
CREATE TYPE "public"."OrganizationType" AS ENUM ('ResearchStructure', 'Institution', 'InstitutionDivision');

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" SERIAL NOT NULL,
    "action" "public"."PermissionAction" NOT NULL,
    "subject" "public"."PermissionSubject" NOT NULL,
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inverted" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "public"."UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "public"."UserRoleScope" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "organizationType" "public"."OrganizationType" NOT NULL,
    "organizationUid" TEXT NOT NULL,

    CONSTRAINT "UserRoleScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "public"."RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "public"."UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRoleScope_organizationType_organizationUid_idx" ON "public"."UserRoleScope"("organizationType", "organizationUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleScope_userId_roleId_organizationType_organizationUi_key" ON "public"."UserRoleScope"("userId", "roleId", "organizationType", "organizationUid");

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRoleScope" ADD CONSTRAINT "UserRoleScope_userId_roleId_fkey" FOREIGN KEY ("userId", "roleId") REFERENCES "public"."UserRole"("userId", "roleId") ON DELETE CASCADE ON UPDATE CASCADE;
