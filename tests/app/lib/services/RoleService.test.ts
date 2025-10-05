import { RoleService } from '@/lib/services/RoleService'
import prisma from '@/lib/daos/prisma'
import type { RolesFileSeed } from '@/lib/services/RoleConfigService'

describe('RoleService Integration', () => {
  const svc = new RoleService()

  beforeEach(async () => {
    await prisma.rolePermission.deleteMany()
    await prisma.userRoleScope.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.role.deleteMany()
    await prisma.permission.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('seeds roles/permissions and is idempotent', async () => {
    const payload: RolesFileSeed = {
      roles: [
        {
          name: 'admin',
          system: true,
          description: 'Full access',
          permissions: [{ action: 'manage', subject: 'all', fields: [] }],
        },
        {
          name: 'document_editor',
          description: 'Edit document metadata globally',
          system: false,
          // Intentionally messy/duplicated order to verify normalization
          permissions: [
            {
              action: 'update',
              subject: 'Document',
              fields: [
                'titles',
                'identifiers',
                'titles',
                'abstracts',
                'contributors',
              ],
            },
          ],
        },
        {
          name: 'document_merger',
          system: false,
          description: 'Merge / unmerge documents and source records',
          permissions: [
            { action: 'merge', subject: 'Document', fields: [] },
            { action: 'unmerge', subject: 'DocumentRecord', fields: [] },
          ],
        },
      ],
    }

    await svc.reset(payload)

    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } })
    expect(roles.map((r) => r.name)).toEqual([
      'admin',
      'document_editor',
      'document_merger',
    ])

    const perms = await prisma.permission.findMany({ orderBy: { id: 'asc' } })
    expect(perms).toHaveLength(4)

    const manage = perms.find(
      (p) => p.action === 'manage' && p.subject === 'all',
    )
    const update = perms.find(
      (p) => p.action === 'update' && p.subject === 'Document',
    )
    const merge = perms.find(
      (p) => p.action === 'merge' && p.subject === 'Document',
    )
    const unmerge = perms.find(
      (p) => p.action === 'unmerge' && p.subject === 'DocumentRecord',
    )

    expect(manage).toBeTruthy()
    expect(update).toBeTruthy()
    expect(merge).toBeTruthy()
    expect(unmerge).toBeTruthy()

    expect(update?.fields).toEqual([
      'abstracts',
      'contributors',
      'identifiers',
      'titles',
    ])

    const rolePerms = await prisma.rolePermission.findMany({
      orderBy: [{ roleId: 'asc' }, { permissionId: 'asc' }],
    })

    const adminId = roles.find((r) => r.name === 'admin')!.id
    const editorId = roles.find((r) => r.name === 'document_editor')!.id
    const mergerId = roles.find((r) => r.name === 'document_merger')!.id

    expect(rolePerms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ roleId: adminId, permissionId: manage!.id }),
        expect.objectContaining({ roleId: editorId, permissionId: update!.id }),
        expect.objectContaining({ roleId: mergerId, permissionId: merge!.id }),
        expect.objectContaining({
          roleId: mergerId,
          permissionId: unmerge!.id,
        }),
      ]),
    )
    expect(rolePerms).toHaveLength(4)

    await svc.reset(payload)

    const roles2 = await prisma.role.findMany()
    const perms2 = await prisma.permission.findMany()
    const rolePerms2 = await prisma.rolePermission.findMany()

    expect(roles2).toHaveLength(3)
    expect(perms2).toHaveLength(4)
    expect(rolePerms2).toHaveLength(4)
  })

  test('updates role-permission mappings (remove/add)', async () => {
    const initial: RolesFileSeed = {
      roles: [
        {
          name: 'document_merger',
          description: 'Merge / unmerge documents and source records',
          system: false,
          permissions: [
            { action: 'merge', subject: 'Document', fields: [] },
            { action: 'unmerge', subject: 'DocumentRecord', fields: [] },
          ],
        },
      ],
    }
    await svc.reset(initial)

    const minusUnmerge: RolesFileSeed = {
      roles: [
        {
          name: 'document_merger',
          description: 'Merge only',
          system: false,
          permissions: [{ action: 'merge', subject: 'Document', fields: [] }],
        },
      ],
    }
    await svc.reset(minusUnmerge)

    const merger = await prisma.role.findUnique({
      where: { name: 'document_merger' },
    })
    const mergerLinks1 = await prisma.rolePermission.findMany({
      where: { roleId: merger!.id },
    })
    expect(mergerLinks1).toHaveLength(1)

    const mergePerm = await prisma.permission.findFirst({
      where: {
        action: 'merge',
        subject: 'Document',
        fields: { equals: [] },
        inverted: false,
      },
    })
    expect(mergePerm).toBeTruthy()
    expect(mergerLinks1[0].permissionId).toBe(mergePerm!.id)

    const plusDelete: RolesFileSeed = {
      roles: [
        {
          name: 'document_merger',
          description: 'Merge + delete document',
          system: false,
          permissions: [
            { action: 'merge', subject: 'Document', fields: [] },
            { action: 'delete', subject: 'Document', fields: [] },
          ],
        },
      ],
    }
    await svc.reset(plusDelete)

    const deletePerm = await prisma.permission.findFirst({
      where: {
        action: 'delete',
        subject: 'Document',
        fields: { equals: [] },
        inverted: false,
      },
    })
    expect(deletePerm).toBeTruthy()

    const mergerLinks2 = await prisma.rolePermission.findMany({
      where: { roleId: merger!.id },
    })
    expect(mergerLinks2).toHaveLength(2)
    const permIds = mergerLinks2.map((l) => l.permissionId)
    expect(permIds).toEqual(
      expect.arrayContaining([mergePerm!.id, deletePerm!.id]),
    )
  })
})
