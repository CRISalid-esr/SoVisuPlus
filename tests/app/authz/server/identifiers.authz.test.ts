import prisma from '@/lib/daos/prisma'
import {
  assignRoleToPersonUid,
  createPersonWithUser,
  resetAuthzDb,
  seedRoles,
} from '../helpers/db'
import { abilityForPersonUid } from '../helpers/ability'
import type { RolesFileSeed } from '@/lib/services/RoleConfigService'
import { PermissionAction } from '@/types/Permission'
import { EntityType } from '@/types/UserRoleScope'
import { PersonDAO } from '@/lib/daos/PersonDAO'

const ROLES_SEED: RolesFileSeed = {
  roles: [
    {
      name: 'account_editor',
      description: 'Edit person identifiers (scope determines reach)',
      system: false,
      permissions: [
        { action: 'update', subject: 'Person', fields: ['identifiers'] },
      ],
    },
    {
      name: 'person_name_editor',
      description: 'Can only update display name — wrong field for identifiers',
      system: false,
      permissions: [
        { action: 'update', subject: 'Person', fields: ['displayName'] },
      ],
    },
  ],
}

describe('AuthZ (Person identifiers) – integration', () => {
  const personDAO = new PersonDAO()

  beforeEach(async () => {
    await resetAuthzDb()
    await seedRoles(ROLES_SEED)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('global account_editor can update identifiers for any person', async () => {
    await createPersonWithUser('local-librarian')
    const { person: alice } = await createPersonWithUser('local-alice')
    const { person: bob } = await createPersonWithUser('local-bob')

    await assignRoleToPersonUid('account_editor', 'local-librarian', null)

    const { ability } = await abilityForPersonUid('local-librarian')

    const aliceDomain = await personDAO.fetchPersonByUid(alice.uid)
    const bobDomain = await personDAO.fetchPersonByUid(bob.uid)

    expect(
      ability.can(PermissionAction.update, aliceDomain!, 'identifiers'),
    ).toBe(true)
    expect(
      ability.can(PermissionAction.update, bobDomain!, 'identifiers'),
    ).toBe(true)
  })

  test('person-scoped account_editor can update own person, not another', async () => {
    const { person: alice } = await createPersonWithUser('local-alice')
    const { person: bob } = await createPersonWithUser('local-bob')

    await assignRoleToPersonUid('account_editor', 'local-alice', {
      entityType: EntityType.Person,
      entityUid: 'local-alice',
    })

    const { ability } = await abilityForPersonUid('local-alice')

    const aliceDomain = await personDAO.fetchPersonByUid(alice.uid)
    const bobDomain = await personDAO.fetchPersonByUid(bob.uid)

    expect(
      ability.can(PermissionAction.update, aliceDomain!, 'identifiers'),
    ).toBe(true)
    expect(
      ability.can(PermissionAction.update, bobDomain!, 'identifiers'),
    ).toBe(false)
  })

  test('user with no role cannot update identifiers', async () => {
    await createPersonWithUser('local-nobody')
    const { person: target } = await createPersonWithUser('local-target')

    const { ability } = await abilityForPersonUid('local-nobody')

    const targetDomain = await personDAO.fetchPersonByUid(target.uid)
    expect(
      ability.can(PermissionAction.update, targetDomain!, 'identifiers'),
    ).toBe(false)
  })

  test('user with update on Person but wrong field cannot update identifiers', async () => {
    await createPersonWithUser('local-name-editor')
    const { person: target } = await createPersonWithUser('local-target')

    await assignRoleToPersonUid('person_name_editor', 'local-name-editor', null)

    const { ability } = await abilityForPersonUid('local-name-editor')

    const targetDomain = await personDAO.fetchPersonByUid(target.uid)
    expect(
      ability.can(PermissionAction.update, targetDomain!, 'identifiers'),
    ).toBe(false)
    // But the allowed field still works
    expect(
      ability.can(PermissionAction.update, targetDomain!, 'displayName'),
    ).toBe(true)
  })

  test('person-scoped account_editor cannot update an out-of-scope person', async () => {
    await createPersonWithUser('local-alice')
    const { person: charlie } = await createPersonWithUser('local-charlie')

    await assignRoleToPersonUid('account_editor', 'local-alice', {
      entityType: EntityType.Person,
      entityUid: 'local-alice',
    })

    const { ability } = await abilityForPersonUid('local-alice')

    const charlieDomain = await personDAO.fetchPersonByUid(charlie.uid)
    expect(
      ability.can(PermissionAction.update, charlieDomain!, 'identifiers'),
    ).toBe(false)
  })
})
