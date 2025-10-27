import type { Session } from 'next-auth'
import type { AuthzContext } from '@/types/authz'

export function makeMockSession(authz: AuthzContext): Session {
  return {
    user: {
      id: 'test-user',
      username: 'testuser',
      orcid: undefined,
      userId: Number(authz.userId) || 1,
      personUid: authz.personUid ?? null,
      authz,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }
}
