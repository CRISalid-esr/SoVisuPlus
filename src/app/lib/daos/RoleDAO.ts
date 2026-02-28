import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import {
  Permission,
  PermissionAction,
  PermissionSubject,
  Role,
} from '@prisma/client'
import { RoleWithPermissionIds } from '@/prisma-schema/extended-client'

export class RoleDAO extends AbstractDAO {
  async upsertRole(
    name: string,
    data: { description?: string | null; system?: boolean },
  ): Promise<Role> {
    return this.prismaClient.role.upsert({
      where: { name },
      update: { description: data.description ?? null, system: !!data.system },
      create: {
        name,
        description: data.description ?? null,
        system: !!data.system,
      },
    })
  }

  async getRoleByName(name: string): Promise<Role | null> {
    return this.prismaClient.role.findUnique({
      where: { name },
    })
  }

  async getRoleWithPermissionIdsByName(
    name: string,
  ): Promise<RoleWithPermissionIds | null> {
    return this.prismaClient.role.findUnique({
      where: { name },
      include: {
        permissions: { select: { permissionId: true } },
      },
    }) as unknown as RoleWithPermissionIds | null
  }

  async setRolePermissions(
    roleId: number,
    desiredPermissionIds: number[],
  ): Promise<void> {
    const current = await this.prismaClient.role.findUnique({
      where: { id: roleId },
      include: { permissions: { select: { permissionId: true } } },
    })

    const currentIds = new Set(
      (current?.permissions ?? []).map((rp) => rp.permissionId),
    )
    const desiredIds = new Set(desiredPermissionIds)

    const toAdd = [...desiredIds].filter((id) => !currentIds.has(id))
    const toRemove = [...currentIds].filter((id) => !desiredIds.has(id))

    if (toAdd.length) {
      console.log(
        `Adding ${toAdd.length} permissions to role ID ${roleId} : `,
        toAdd,
      )
      await this.prismaClient.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      })
    }

    for (const permissionId of toRemove) {
      console.log(
        `Removing permission ID ${permissionId} from role ID ${roleId}`,
      )
      await this.prismaClient.rolePermission.deleteMany({
        where: { roleId, permissionId },
      })
    }
  }

  async findOrCreatePermission(params: {
    action: PermissionAction
    subject: PermissionSubject
    inverted?: boolean
    fields?: string[]
    description?: string | null
  }): Promise<Permission> {
    const { action, subject, description } = params
    const inverted = !!params.inverted
    const fields = params.fields ?? []

    const found = await this.prismaClient.permission.findFirst({
      where: {
        action,
        subject,
        inverted,
        fields: { equals: fields },
      },
    })
    if (found) return found
    console.log(
      `Creating permission: ${action} ${subject} [inverted=${inverted}] fields=${fields.join(',')}`,
    )
    return this.prismaClient.permission.create({
      data: {
        action,
        subject,
        inverted,
        fields,
        conditions: undefined,
        description: description ?? null,
      },
    })
  }

  async removeOrphanPermissions(): Promise<void> {
    const result = await this.prismaClient.permission.deleteMany({
      where: {
        roles: {
          none: {},
        },
      },
    })

    if (result.count > 0) {
      console.log(`Removed ${result.count} orphan permission(s)`)
    }
  }
}
