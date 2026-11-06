import { hasWiderThanSelfPersonScope } from '@/app/auth/ability'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { EntityType } from '@/types/UserRoleScope'

const isWide = (context: Parameters<typeof hasWiderThanSelfPersonScope>[0]) =>
  hasWiderThanSelfPersonScope(
    context,
    PermissionAction.update,
    PermissionSubject.Person,
    'identifiers',
  )

const accountEditor = (
  scopes: { entityType: EntityType; entityUid: string }[],
) =>
  makeAuthzContext({
    personUid: 'alice',
    roleAssignments: [
      makeAssignment(
        'account_editor',
        [
          {
            action: PermissionAction.update,
            subject: PermissionSubject.Person,
            fields: ['identifiers'],
          },
        ],
        scopes,
      ),
    ],
  })

const admin = makeAuthzContext({
  personUid: 'alice',
  roleAssignments: [
    makeAssignment('admin', [
      { action: PermissionAction.manage, subject: PermissionSubject.all },
    ]),
  ],
})

describe('hasWiderThanSelfPersonScope', () => {
  test('a self-scoped editor is not wide', () => {
    expect(
      isWide(
        accountEditor([{ entityType: EntityType.Person, entityUid: 'alice' }]),
      ),
    ).toBe(false)
  })

  test('a global or structure-scoped editor is wide', () => {
    expect(isWide(accountEditor([]))).toBe(true)
    expect(
      isWide(
        accountEditor([
          { entityType: EntityType.ResearchUnit, entityUid: 'u1' },
        ]),
      ),
    ).toBe(true)
  })

  test('admin (manage / all) is wide', () => {
    expect(isWide(admin)).toBe(true)
  })

  test('manage on Person without field restriction is wide', () => {
    const personManager = makeAuthzContext({
      personUid: 'alice',
      roleAssignments: [
        makeAssignment('person_manager', [
          {
            action: PermissionAction.manage,
            subject: PermissionSubject.Person,
          },
        ]),
      ],
    })
    expect(isWide(personManager)).toBe(true)
  })

  test('a permission on another field is not enough', () => {
    const nameEditor = makeAuthzContext({
      personUid: 'alice',
      roleAssignments: [
        makeAssignment('name_editor', [
          {
            action: PermissionAction.update,
            subject: PermissionSubject.Person,
            fields: ['displayName'],
          },
        ]),
      ],
    })
    expect(isWide(nameEditor)).toBe(false)
  })
})
