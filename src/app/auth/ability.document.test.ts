// file: tests/app/auth/ability.document.unit.test.ts
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import type { AuthzContext, RoleAssignment, Scope } from '@/types/authz'

/** Minimal "document" the ability can reason about */
const makeAuthzDoc = (
  people: string[] = [],
  rs: string[] = [],
  extras: Record<string, unknown> = {},
) => ({
  authzProperties: {
    __type: 'Document',
    perimeter: {
      Person: people,
      ResearchStructure: rs,
    },
    ...extras,
  },
})

const makeAssignment = (
  role: string,
  permissions: Array<{
    action: PermissionAction
    subject: PermissionSubject
    fields?: string[]
  }>,
  scopes: Scope[] = [],
): RoleAssignment => ({
  role,
  permissions,
  scopes,
})

describe('Ability on Document (unit, no DB)', () => {
  test('merge allowed when scope intersects Person perimeter', () => {
    const ctx: AuthzContext = {
      userId: 'u-1',
      personUid: 'local-pdurand',
      roleAssignments: [
        makeAssignment(
          'document_merger',
          [
            {
              action: PermissionAction.merge,
              subject: PermissionSubject.Document,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-pdurand' }],
        ),
      ],
      roles: ['document_merger'],
      scopes: [
        {
          entityType: 'Person',
          entityUid: 'local-pdurand',
          role: 'document_merger',
        },
      ],
    }

    const ability = abilityFromAuthzContext(ctx)
    const docInScope = makeAuthzDoc(['local-pdurand'])
    const docOutOfScope = makeAuthzDoc(['someone-else'])

    expect(ability.can(PermissionAction.merge, docInScope)).toBe(true)
    expect(ability.can(PermissionAction.merge, docOutOfScope)).toBe(false)
  })

  test('merge allowed when scope intersects ResearchStructure perimeter', () => {
    const ctx: AuthzContext = {
      userId: 'u-2',
      personUid: null,
      roleAssignments: [
        makeAssignment(
          'document_merger',
          [
            {
              action: PermissionAction.merge,
              subject: PermissionSubject.Document,
            },
          ],
          [{ entityType: 'ResearchStructure', entityUid: 'RS-123' }],
        ),
      ],
      roles: ['document_merger'],
      scopes: [
        {
          entityType: 'ResearchStructure',
          entityUid: 'RS-123',
          role: 'document_merger',
        },
      ],
    }

    const ability = abilityFromAuthzContext(ctx)
    const docInScope = makeAuthzDoc([], ['RS-123'])
    const docOutOfScope = makeAuthzDoc([], ['RS-999'])

    expect(ability.can(PermissionAction.merge, docInScope)).toBe(true)
    expect(ability.can(PermissionAction.merge, docOutOfScope)).toBe(false)
  })

  test('global role (no scopes) can merge any document', () => {
    const ctx: AuthzContext = {
      userId: 'u-3',
      personUid: null,
      roleAssignments: [
        makeAssignment('document_merger', [
          {
            action: PermissionAction.merge,
            subject: PermissionSubject.Document,
          },
        ]),
      ],
      roles: ['document_merger'],
      scopes: [],
    }

    const ability = abilityFromAuthzContext(ctx)
    const docA = makeAuthzDoc(['a'], ['RS-1'])
    const docB = makeAuthzDoc()

    expect(ability.can(PermissionAction.merge, docA)).toBe(true)
    expect(ability.can(PermissionAction.merge, docB)).toBe(true)
  })

  test('field-level update: titles allowed, abstracts denied', () => {
    const ctx: AuthzContext = {
      userId: 'u-4',
      personUid: 'local-pdurand',
      roleAssignments: [
        makeAssignment(
          'document_editor',
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Document,
              fields: ['titles', 'identifiers', 'contributors'],
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-pdurand' }],
        ),
      ],
      roles: ['document_editor'],
      scopes: [
        {
          entityType: 'Person',
          entityUid: 'local-pdurand',
          role: 'document_editor',
        },
      ],
    }
    const ability = abilityFromAuthzContext(ctx)
    const doc = makeAuthzDoc(['local-pdurand'])

    expect(ability.can(PermissionAction.update, doc, 'titles')).toBe(true)
    expect(ability.can(PermissionAction.update, doc, 'abstracts')).toBe(false)
    expect(ability.can(PermissionAction.update, doc, 'no_exists')).toBe(false)
  })

  test('no false positives across entity types', () => {
    const ctx: AuthzContext = {
      userId: 'u-5',
      personUid: null,
      roleAssignments: [
        makeAssignment(
          'document_merger',
          [
            {
              action: PermissionAction.merge,
              subject: PermissionSubject.Document,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-zed' }],
        ),
      ],
      roles: ['document_merger'],
      scopes: [
        {
          entityType: 'Person',
          entityUid: 'local-zed',
          role: 'document_merger',
        },
      ],
    }
    const ability = abilityFromAuthzContext(ctx)

    const docOnlyRS = makeAuthzDoc([], ['RS-777'])
    expect(ability.can(PermissionAction.merge, docOnlyRS)).toBe(false)
  })
})
