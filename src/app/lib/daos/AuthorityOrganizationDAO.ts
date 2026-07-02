import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationWithRelations as DbAuthorityOrganization } from '@/prisma-schema/extended-client'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'

export class AuthorityOrganizationDAO extends AbstractDAO {
  /**
   * Create or update a AuthorityOrganization record in the database
   * @param authority - The AuthorityOrganization object to create or update
   * @returns The created or updated AuthorityOrganization record
   */
  public async createOrUpdateAuthorityOrganization(
    authority: AuthorityOrganization,
  ): Promise<DbAuthorityOrganization> {
    const { uid, displayNames, type, places, identifiers } = authority
    try {
      // Identifiers are a shared many-to-many entity keyed by (type, value) — the same
      // identifier legitimately belongs to several authority organizations (a graph org's
      // root and its states share identifiers). Reuse existing rows via connectOrCreate
      // rather than deleting/recreating them, which would collide on the (type, value) unique.
      const seen = new Set<string>()
      const identifierLinks = identifiers
        .map((identifier) => ({
          type: AuthorityOrganizationIdentifier.authorityOrganizationIdentifierTypeFromString(
            identifier.type,
          ),
          value: identifier.value,
        }))
        .filter((identifier) => {
          if (!identifier.type) {
            console.error(
              `Invalid identifier type for authority organization UID ${uid}`,
            )
            return false
          }
          // A root-elected affiliation unions many states, so dedupe (type, value).
          const key = `${identifier.type}::${identifier.value}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .map((identifier) => ({
          where: {
            type_value: { type: identifier.type!, value: identifier.value },
          },
          create: { type: identifier.type!, value: identifier.value },
        }))

      return await this.prismaClient.authorityOrganization.upsert({
        where: { uid: uid },
        create: {
          uid: uid,
          displayNames: displayNames,
          type: type,
          places: places,
          identifiers: { connectOrCreate: identifierLinks },
        },
        update: {
          displayNames: displayNames,
          type: type,
          places: places,
          // Disconnect the org's current identifiers, then reconnect/create the shared rows.
          identifiers: { set: [], connectOrCreate: identifierLinks },
        },
        include: {
          identifiers: true,
        },
      })
    } catch (error) {
      console.error(
        'Error during authority organization creation or update:',
        error as Error,
      )
      throw new Error(
        `Failed to create or update authority organization: ${(error as Error).message}`,
      )
    }
  }
}
