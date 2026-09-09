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
import { hasWiderThanSelfPersonScope } from '@/app/auth/ability'
import {
  computeIdentifierCapabilities,
  identifierSupportsAuth,
} from '@/lib/identifiers/identifierCapabilities'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

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

  test('self-scoped account_editor cannot update own idref (hasWiderThanSelfPersonScope = false)', async () => {
    const { person: alice } = await createPersonWithUser('local-alice')

    await assignRoleToPersonUid('account_editor', 'local-alice', {
      entityType: EntityType.Person,
      entityUid: 'local-alice',
    })

    const { ability, ctx } = await abilityForPersonUid('local-alice')

    const aliceDomain = await personDAO.fetchPersonByUid(alice.uid)

    // CASL check alone passes (self-scoped rule matches own person)
    expect(
      ability.can(PermissionAction.update, aliceDomain!, 'identifiers'),
    ).toBe(true)

    // But hasWiderThanSelfPersonScope blocks IdRef editing
    const { hasWiderThanSelfPersonScope } = await import('@/app/auth/ability')
    expect(
      hasWiderThanSelfPersonScope(ctx, 'update', 'Person', 'identifiers'),
    ).toBe(false)
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

/**
 * Full capability matrix from
 * specs/872-refactor-account-edition-workflow/prompt.md, wiring the real
 * ability + scope helpers into computeIdentifierCapabilities. `isAuthenticated`
 * is passed explicitly to cover the non-authenticated / authenticated columns
 * without persisting OAuth rows.
 */
describe('AuthZ (identifier capability matrix) – integration', () => {
  const personDAO = new PersonDAO()

  beforeEach(async () => {
    await resetAuthzDb()
    await seedRoles(ROLES_SEED)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const capsFor = async (
    actorUid: string,
    targetUid: string,
    type: PersonIdentifierType,
    isAuthenticated: boolean,
  ) => {
    const { ability, ctx } = await abilityForPersonUid(actorUid)
    const target = await personDAO.fetchPersonByUid(targetUid)
    return computeIdentifierCapabilities({
      canManage: ability.can(PermissionAction.update, target!, 'identifiers'),
      isOwn: ctx.personUid === target!.uid,
      isWide: hasWiderThanSelfPersonScope(
        ctx,
        'update',
        'Person',
        'identifiers',
      ),
      isAuthenticated,
      supportsAuth: identifierSupportsAuth(type),
    })
  }

  test('self-scoped editor, own account: remove + authenticate, no unauth add', async () => {
    await createPersonWithUser('local-alice')
    await assignRoleToPersonUid('account_editor', 'local-alice', {
      entityType: EntityType.Person,
      entityUid: 'local-alice',
    })

    const nonAuth = await capsFor(
      'local-alice',
      'local-alice',
      PersonIdentifierType.orcid,
      false,
    )
    expect(nonAuth).toEqual({
      canAuthenticate: true,
      canAddUnauthenticated: false,
      canRemove: true,
    })

    const auth = await capsFor(
      'local-alice',
      'local-alice',
      PersonIdentifierType.orcid,
      true,
    )
    expect(auth.canRemove).toBe(true)
    expect(auth.canAddUnauthenticated).toBe(false)
  })

  test('self-scoped editor, own IdRef: can remove but cannot add (no auth workflow)', async () => {
    await createPersonWithUser('local-alice')
    await assignRoleToPersonUid('account_editor', 'local-alice', {
      entityType: EntityType.Person,
      entityUid: 'local-alice',
    })

    const caps = await capsFor(
      'local-alice',
      'local-alice',
      PersonIdentifierType.idref,
      false,
    )
    expect(caps).toEqual({
      canAuthenticate: false,
      canAddUnauthenticated: false,
      canRemove: true,
    })
  })

  test('wide editor, own account: can add unauthenticated and authenticate', async () => {
    await createPersonWithUser('local-librarian')
    await assignRoleToPersonUid('account_editor', 'local-librarian', null)

    const caps = await capsFor(
      'local-librarian',
      'local-librarian',
      PersonIdentifierType.orcid,
      false,
    )
    expect(caps).toEqual({
      canAuthenticate: true,
      canAddUnauthenticated: true,
      canRemove: true,
    })
  })

  test('wide editor, another account: add/remove non-authenticated, but no action on authenticated', async () => {
    await createPersonWithUser('local-librarian')
    await createPersonWithUser('local-bob')
    await assignRoleToPersonUid('account_editor', 'local-librarian', null)

    const nonAuth = await capsFor(
      'local-librarian',
      'local-bob',
      PersonIdentifierType.orcid,
      false,
    )
    expect(nonAuth).toEqual({
      canAuthenticate: false,
      canAddUnauthenticated: true,
      canRemove: true,
    })

    const auth = await capsFor(
      'local-librarian',
      'local-bob',
      PersonIdentifierType.orcid,
      true,
    )
    expect(auth).toEqual({
      canAuthenticate: false,
      canAddUnauthenticated: true, // slot is occupied → UI won't offer add; remove is blocked
      canRemove: false,
    })
  })

  test('self-scoped editor on someone else’s account: no capability at all', async () => {
    await createPersonWithUser('local-alice')
    await createPersonWithUser('local-bob')
    await assignRoleToPersonUid('account_editor', 'local-alice', {
      entityType: EntityType.Person,
      entityUid: 'local-alice',
    })

    const caps = await capsFor(
      'local-alice',
      'local-bob',
      PersonIdentifierType.orcid,
      false,
    )
    expect(caps).toEqual({
      canAuthenticate: false,
      canAddUnauthenticated: false,
      canRemove: false,
    })
  })

  test('user with no role: no capability at all', async () => {
    await createPersonWithUser('local-nobody')
    await createPersonWithUser('local-target')

    const caps = await capsFor(
      'local-nobody',
      'local-target',
      PersonIdentifierType.orcid,
      false,
    )
    expect(caps).toEqual({
      canAuthenticate: false,
      canAddUnauthenticated: false,
      canRemove: false,
    })
  })
})
