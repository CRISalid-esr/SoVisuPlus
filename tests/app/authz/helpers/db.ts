// tests/app/authz/helpers/db.ts
import prisma from '@/lib/daos/prisma'
import type { RolesFileSeed } from '@/lib/services/RoleConfigService'
import { RoleService } from '@/lib/services/RoleService'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { EntityType } from '@/types/UserRoleScope'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'

export const resetAuthzDb = async () => {
  await prisma.rolePermission.deleteMany()
  await prisma.userRoleScope.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()

  await prisma.contribution.deleteMany()
  await prisma.document.updateMany({ data: { journalId: null } })
  await prisma.document.deleteMany()

  await prisma.membership.deleteMany()
  await prisma.personIdentifier.deleteMany()
  await prisma.user.deleteMany()
  await prisma.person.deleteMany()
  await prisma.researchStructureIdentifier.deleteMany()
  await prisma.researchStructureName.deleteMany()
  await prisma.researchStructureDescription.deleteMany()
  await prisma.researchStructure.deleteMany()
}

export const seedRoles = async (payload: RolesFileSeed) => {
  const svc = new RoleService()
  await svc.reset(payload)
}

export const createResearchStructure = async (uid: string, acronym?: string) =>
  prisma.researchStructure.create({
    data: {
      uid,
      acronym: acronym ?? null,
      external: false,
      names: { create: [{ language: 'en', value: acronym ?? uid }] },
      descriptions: { create: [{ language: 'en', value: `RS ${uid}` }] },
    },
  })

export const createPersonWithUser = async (
  personUid: string,
  opts?: {
    firstName?: string
    lastName?: string
    displayName?: string
  },
) => {
  const person = await prisma.person.create({
    data: {
      uid: personUid,
      firstName: opts?.firstName ?? 'John',
      lastName: opts?.lastName ?? 'Doe',
      displayName:
        opts?.displayName ??
        `${opts?.firstName ?? 'John'} ${opts?.lastName ?? 'Doe'}`,
      external: false,
      normalizedName: (opts?.displayName ?? 'john doe').toLowerCase(),
      identifiers: {
        create: [{ type: 'LOCAL', value: personUid }],
      },
    },
  })

  const user = await prisma.user.create({
    data: { personId: person.id },
  })

  return { person, user }
}

export const addMembership = async (personId: number, rsId: number) =>
  prisma.membership.create({
    data: {
      personId,
      researchStructureId: rsId,
      startDate: new Date('2020-01-01'),
      positionCode: 'RES',
    },
  })

export const createDocumentWithContributors = async (
  docUid: string,
  contributorPersonIds: number[],
) => {
  const doc = await prisma.document.create({
    data: {
      uid: docUid,
      documentType: 'JournalArticle',
      publicationDate: '2024',
      publicationDateStart: new Date('2024-01-01'),
      publicationDateEnd: new Date('2024-12-31'),
    },
  })

  if (contributorPersonIds.length) {
    await prisma.contribution.createMany({
      data: contributorPersonIds.map((pid) => ({
        personId: pid,
        documentId: doc.id,
        roles: ['author'],
      })),
      skipDuplicates: true,
    })
  }
  const dao = new DocumentDAO()
  const domainDoc = await dao.fetchDocumentById(doc.uid)
  if (!domainDoc) {
    throw new Error(`Document ${doc.uid} was created but not found on reload`)
  }
  return domainDoc
}

/** Assign a role to the user, optionally scoped */
export const assignRoleToPersonUid = async (
  roleName: string,
  personUid: string,
  scope?: { entityType: EntityType; entityUid: string } | null,
) => {
  const svc = new RoleService()
  return svc.assignRoleToUser({
    roleName,
    scope: scope ?? null,
    user: {
      idType: PersonIdentifierType.LOCAL,
      idValue: personUid,
    },
  })
}
