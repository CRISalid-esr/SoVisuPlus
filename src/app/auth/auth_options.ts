import {
  Account,
  AuthOptions,
  DefaultSession,
  Profile,
  User as NextAuthUser,
} from 'next-auth'
import KeycloakProvider, { KeycloakProfile } from 'next-auth/providers/keycloak'
import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { UserDAO } from '@/lib/daos/UserDAO'
import { JWT } from 'next-auth/jwt'
import { Session } from '@auth/core/types'
import { userToAuthzContext } from '@/app/auth/ability'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { AuthzContext } from '@/types/authz'

declare module '@auth/core/types' {
  interface User {
    username?: string
    orcid?: string
    userId?: number
    personUid?: string | null
    authz?: AuthzContext
  }
}

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id?: string
      username?: string
      orcid?: string
      userId?: number
      personUid?: string | null
      authz?: AuthzContext
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string
    orcid?: string
    userId?: number
    personUid?: string | null
    authz?: AuthzContext
  }
}

const DEFAULT_JWT_EXP_HOURS = 12
const MIN_JWT_EXP_HOURS = 1
const MAX_JWT_EXP_HOURS = 24 * 7 // 7 days

function parseIntStrict(value: string | undefined): number | null {
  if (value === undefined) return null
  // Only digits allowed
  if (!/^\d+$/.test(value)) return null
  const n = Number(value)
  return Number.isSafeInteger(n) ? n : null
}

export function getJwtMaxAgeSeconds(): number {
  const raw = process.env.JWT_TOKEN_EXPIRATION_HOURS
  const hours = parseIntStrict(raw) ?? DEFAULT_JWT_EXP_HOURS

  const restrictedHours = Math.min(
    MAX_JWT_EXP_HOURS,
    Math.max(MIN_JWT_EXP_HOURS, hours),
  )

  if (raw !== undefined) {
    const parsed = parseIntStrict(raw)
    if (parsed === null) {
      console.warn(
        `[auth] Invalid JWT_TOKEN_EXPIRATION_HOURS="${raw}". Using default=${DEFAULT_JWT_EXP_HOURS}h`,
      )
    } else if (parsed !== restrictedHours) {
      console.warn(
        `[auth] JWT_TOKEN_EXPIRATION_HOURS=${parsed}h out of range. Clamped to ${restrictedHours}h`,
      )
    }
  }

  return restrictedHours * 60 * 60
}

// utility function to strip domain if username is an eppn (temporary)
const stripDomainFromEppn = (username: string): string => {
  const atIndex = username.indexOf('@')
  return atIndex > 0 ? username.substring(0, atIndex) : username
}

const authOptions: AuthOptions = {
  debug: true,
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: getJwtMaxAgeSeconds(),
  },
  callbacks: {
    async signIn({
      user,
      account,
      profile,
    }: {
      user: NextAuthUser
      account: Account | null
      profile?: Profile
    }) {
      console.info('signIn callback', user, account, profile)
      const userService = new UserService()
      const username = (profile as KeycloakProfile)?.preferred_username
      const authenticationProfile: AuthenticationProfile = {
        // Temporary : if username is an eppn jdupont@my-univ.fr, remove the domain part
        username: username ? stripDomainFromEppn(username) : undefined,
        email: profile?.email,
        orcid: (profile as KeycloakProfile)?.orcid,
      }
      return await userService.submitProfile(authenticationProfile)
    },
    async jwt({
      token,
      account,
      user,
      profile,
    }: {
      token: JWT
      account?: Account | null
      user?: NextAuthUser
      profile?: Profile
    }) {
      console.info('jwt callback', token, account, user, profile)
      if (profile) {
        const username = (profile as KeycloakProfile)?.preferred_username
        // temporary : if username is an eppn, strip domain part
        token.username = username ? stripDomainFromEppn(username) : undefined
        token.email = profile?.email
        token.orcid = (profile as KeycloakProfile)?.orcid
      }
      if (account && user) {
        token.id = user.id
      }
      const userDAO = new UserDAO()
      const identifier = token.username
        ? new PersonIdentifier(
            PersonIdentifierType.local,
            String(token.username),
          )
        : token.orcid
          ? new PersonIdentifier(
              PersonIdentifierType.orcid,
              String(token.orcid),
            )
          : null
      console.info('resolving user for identifier', identifier)

      if (identifier) {
        try {
          const domainUser = await userDAO.getUserByIdentifier(identifier)
          console.info('resolved domain user', domainUser)
          if (domainUser) {
            token.authz = userToAuthzContext(domainUser, String(token.id ?? ''))
            console.info('enriched token with authz', token.authz)
          }
        } catch (e) {
          console.warn('[auth/jwt] failed to enrich token with authz:', e)
        }
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      console.info('session callback', session, token)
      if (token && session.user) {
        console.info('enriching session user from token')
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.orcid = token.orcid as string
        session.user.userId = token.userId
        session.user.personUid = token.personUid ?? null
        session.user.authz = token.authz
      }
      return session
    },
  },
  pages: {
    signIn: '/[locale]/api/auth/providers',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
export default authOptions
