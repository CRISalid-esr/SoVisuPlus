/*
  Warnings:

  - Added the required column `places` to the `AuthorityOrganization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuthorityOrganization" ADD COLUMN     "places" JSONB NOT NULL;
