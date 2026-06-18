-- CreateEnum
CREATE TYPE "AuthorityOrganizationType" AS ENUM ('organization', 'research_team_group', 'laboratory', 'research_team', 'institution', 'laboratory_group', 'institution_group');

-- AlterTable
ALTER TABLE "AuthorityOrganization" ADD COLUMN     "type" "AuthorityOrganizationType";
