import { Prisma } from '@prisma/client'

/**
 * Prisma include fragments shared by several DAOs, so that a relation is
 * fetched with the same shape wherever it is mapped.
 */

/**
 * Person identifiers with the ORCID OAuth grant metadata, which tells whether an
 * ORCID is authenticated. The tokens are never selected.
 */
export const identifiersWithOrcidGrantInclude = {
  include: {
    orcidIdentifier: {
      select: {
        id: true,
        scope: true,
        tokenType: true,
        obtainedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    },
  },
} satisfies Prisma.PersonIdentifierDefaultArgs
