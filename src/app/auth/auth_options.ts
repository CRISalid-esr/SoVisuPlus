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
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { JWT } from 'next-auth/jwt'
import { Session } from '@auth/core/types'
import { userToAuthzContext } from '@/app/auth/ability'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
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
      const userService = new UserService(
        new UserDAO(),
        new PersonDAO(),
        new PersonGraphQLClient(),
      )
      const authenticationProfile: AuthenticationProfile = {
        username: (profile as KeycloakProfile)?.preferred_username,
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
        token.username = (profile as KeycloakProfile)?.preferred_username
        token.email = profile?.email
        token.orcid = (profile as KeycloakProfile)?.orcid
      }
      if (account && user) {
        token.id = user.id
      }
      const userDAO = new UserDAO()

      const identifier = token.username
        ? { type: PersonIdentifierType.LOCAL, value: String(token.username) }
        : token.orcid
          ? { type: PersonIdentifierType.ORCID, value: String(token.orcid) }
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
