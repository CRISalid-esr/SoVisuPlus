import { hasUnscopedPermission } from '@/app/auth/ability'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

const structureManager = (scopes = []) =>
  makeAuthzContext({
    roleAssignments: [
      makeAssignment(
        'structure_manager',
        [
          {
            action: PermissionAction.update,
            subject: PermissionSubject.OrganizationUnit,
            fields: ['hidden'],
          },
        ],
        scopes,
      ),
    ],
  })

const canHide = (context: Parameters<typeof hasUnscopedPermission>[0]) =>
  hasUnscopedPermission(
    context,
    PermissionAction.update,
    PermissionSubject.OrganizationUnit,
    'hidden',
  )

describe('hasUnscopedPermission on OrganizationUnit', () => {
  test('a global structure_manager may hide structures', () => {
    expect(canHide(structureManager())).toBe(true)
  })

  test('admin (manage / all) may hide structures', () => {
    const admin = makeAuthzContext({
      roleAssignments: [
        makeAssignment('admin', [
          {
            action: PermissionAction.manage,
            subject: PermissionSubject.all,
          },
        ]),
      ],
    })
    expect(canHide(admin)).toBe(true)
  })

  test('a scoped admin still has full access', () => {
    // `manage` on `all` means full access however it was assigned: scoping it
    // narrows the perimeter of the subjects that have one, and OrganizationUnit
    // has none.
    const scopedAdmin = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'admin',
          [
            {
              action: PermissionAction.manage,
              subject: PermissionSubject.all,
            },
          ],
          [
            { entityType: 'ResearchUnit', entityUid: 'local-lpnc' },
            { entityType: 'Team', entityUid: 'local-team' },
          ] as never,
        ),
      ],
    })
    expect(canHide(scopedAdmin)).toBe(true)
  })

  test('a scoped non-admin assignment does not grant it', () => {
    // CASL would let this through on a subject-type check, since it cannot
    // evaluate conditions without an instance — hence this helper.
    const scoped = structureManager([
      { entityType: 'Institution', entityUid: 'local-univ' },
    ] as never)
    expect(canHide(scoped)).toBe(false)
  })

  test('a permission on another field does not grant it', () => {
    const other = makeAuthzContext({
      roleAssignments: [
        makeAssignment('structure_renamer', [
          {
            action: PermissionAction.update,
            subject: PermissionSubject.OrganizationUnit,
            fields: ['acronym'],
          },
        ]),
      ],
    })
    expect(canHide(other)).toBe(false)
  })

  test('a permission on another subject does not grant it', () => {
    const documentEditor = makeAuthzContext({
      roleAssignments: [
        makeAssignment('document_editor', [
          {
            action: PermissionAction.update,
            subject: PermissionSubject.Document,
            fields: ['hidden'],
          },
        ]),
      ],
    })
    expect(canHide(documentEditor)).toBe(false)
  })

  test('an anonymous context grants nothing', () => {
    expect(canHide(undefined)).toBe(false)
  })
})
