import prisma from '@/lib/daos/prisma'
import {
  addMembership,
  assignRoleToPersonUid,
  createDocumentWithContributors,
  createPersonWithUser,
  createResearchUnit,
  resetAuthzDb,
  seedRoles,
} from '../helpers/db'
import { abilityForPersonUid } from '../helpers/ability'
import type { RolesFileSeed } from '@/lib/services/RoleConfigService'
import { PermissionAction } from '@/types/Permission'
import { EntityType } from '@/types/UserRoleScope'

describe('AuthZ (Document) – integration', () => {
  beforeEach(async () => {
    await resetAuthzDb()
    const rolesSeed: RolesFileSeed = {
      roles: [
        {
          name: 'document_editor',
          description: 'Edit document metadata',
          system: false,
          permissions: [
            {
              action: 'update',
              subject: 'Document',
              fields: ['titles', 'identifiers', 'contributors', 'abstracts'],
            },
          ],
        },
        {
          name: 'document_merger',
          description: 'Merge/unmerge documents',
          system: false,
          permissions: [
            { action: 'merge', subject: 'Document', fields: [] },
            { action: 'unmerge', subject: 'DocumentRecord', fields: [] },
          ],
        },
      ],
    }
    await seedRoles(rolesSeed)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('person-scoped merger can merge in-scope document, not out-of-scope', async () => {
    const rs = await createResearchUnit('RS-1', 'RS ONE')
    const { person: alice } = await createPersonWithUser('local-alice')
    const { person: bob } = await createPersonWithUser('local-bob')

    await addMembership(alice.id, rs.id) // alice belongs to RS-1
    await addMembership(bob.id, rs.id) // bob also belongs to RS-1

    // Documents: one with Alice, one with Bob
    const docA = await createDocumentWithContributors('doc-A', [alice.id])
    const docB = await createDocumentWithContributors('doc-B', [bob.id])

    // Alice gets "document_merger" scoped to Person:local-alice
    await assignRoleToPersonUid('document_merger', 'local-alice', {
      entityType: EntityType.Person,
      entityUid: 'local-alice',
    })

    const { ability } = await abilityForPersonUid('local-alice')

    expect(ability.can(PermissionAction.merge, docA)).toBe(true)
    expect(ability.can(PermissionAction.merge, docB)).toBe(false)
  })

  test('RS-scoped merger can merge any doc that involves that RS', async () => {
    const rs = await createResearchUnit('RS-42', 'RS FortyTwo')

    const { person: p1 } = await createPersonWithUser('local-p1')
    const { person: p2 } = await createPersonWithUser('local-p2')
    await addMembership(p1.id, rs.id) // p1 in RS-42
    // p2 has no membership in RS-42

    const docIn = await createDocumentWithContributors('doc-in', [p1.id])
    const docOut = await createDocumentWithContributors('doc-out', [p2.id])

    // Role assigned to p1 but scoped to ResearchUnit:RS-42
    await assignRoleToPersonUid('document_merger', 'local-p1', {
      entityType: EntityType.ResearchUnit,
      entityUid: 'RS-42',
    })

    const { ability } = await abilityForPersonUid('local-p1')

    expect(ability.can(PermissionAction.merge, docIn)).toBe(true)
    expect(ability.can(PermissionAction.merge, docOut)).toBe(false)
  })

  test('global merger can merge any document', async () => {
    await createPersonWithUser('local-admin')

    const { person: p1 } = await createPersonWithUser('local-p1')
    const { person: p2 } = await createPersonWithUser('local-p2')

    const doc1 = await createDocumentWithContributors('doc-1', [p1.id])
    const doc2 = await createDocumentWithContributors('doc-2', [p2.id])

    // Assign global role (no scope)
    await assignRoleToPersonUid('document_merger', 'local-admin', null)

    const { ability } = await abilityForPersonUid('local-admin')

    expect(ability.can(PermissionAction.merge, doc1)).toBe(true)
    expect(ability.can(PermissionAction.merge, doc2)).toBe(true)
  })

  test('field-level updates respect fields list', async () => {
    const { person } = await createPersonWithUser('john-local-editor')
    const doc = await createDocumentWithContributors('doc-edit', [person.id])

    // editor scoped to his own Person
    await assignRoleToPersonUid('document_editor', 'john-local-editor', {
      entityType: EntityType.Person,
      entityUid: 'john-local-editor',
    })

    const { ability } = await abilityForPersonUid('john-local-editor')

    // Must pass field for fielded permission checks
    expect(ability.can(PermissionAction.update, doc, 'titles')).toBe(true)
    expect(ability.can(PermissionAction.update, doc, 'identifiers')).toBe(true)
    expect(ability.can(PermissionAction.update, doc, 'abstracts')).toBe(true)
    // Not listed -> denied
    expect(ability.can(PermissionAction.update, doc, 'pages')).toBe(false)
  })

  test('no false positive if scopes do not intersect', async () => {
    await createPersonWithUser('local-a')
    const { person: b } = await createPersonWithUser('local-b')

    const doc = await createDocumentWithContributors('doc-x', [b.id])

    await assignRoleToPersonUid('document_merger', 'local-a', {
      entityType: EntityType.Person,
      entityUid: 'local-a',
    })

    const { ability } = await abilityForPersonUid('local-a')

    expect(ability.can(PermissionAction.merge, doc)).toBe(false)
  })
  test('multi-type scopes work as OR across rules', async () => {
    const { person: a } = await createPersonWithUser('local-a')
    const rs = await createResearchUnit('RS-X', 'RS X')
    await addMembership(a.id, rs.id)

    const docByA = await createDocumentWithContributors('doc-a', [a.id])

    // Assign role with 2 scope entries (Person + ResearchUnit)
    await assignRoleToPersonUid('document_merger', 'local-a', {
      entityType: EntityType.Person,
      entityUid: 'local-a',
    })
    await assignRoleToPersonUid('document_merger', 'local-a', {
      entityType: EntityType.ResearchUnit,
      entityUid: 'RS-X',
    })

    const { ability } = await abilityForPersonUid('local-a')
    expect(ability.can(PermissionAction.merge, docByA)).toBe(true)
  })

  test('editor cannot update out-of-scope document', async () => {
    await createPersonWithUser('local-editor')
    const { person: someoneElse } = await createPersonWithUser('local-other')

    const doc = await createDocumentWithContributors('doc-out', [
      someoneElse.id,
    ])

    await assignRoleToPersonUid('document_editor', 'local-editor', {
      entityType: EntityType.Person,
      entityUid: 'local-editor',
    })

    const { ability } = await abilityForPersonUid('local-editor')
    expect(ability.can(PermissionAction.update, doc, 'titles')).toBe(false)
  })
})
