import { Account, AuthOptions, Profile, User as NextAuthUser } from 'next-auth'
import KeycloakProvider, { KeycloakProfile } from 'next-auth/providers/keycloak'
import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { JWT } from 'next-auth/jwt'
import { Session } from '@auth/core/types'

declare module '@auth/core/types' {
  interface User {
    username?: string
    orcid?: string
  }
}

function decodeJwtPayload(token: string | undefined): object | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

const authOptions: AuthOptions = {
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
      if (profile) {
        token.username = (profile as KeycloakProfile)?.preferred_username
        token.email = profile?.email
        token.orcid = (profile as KeycloakProfile)?.orcid
      }
      if (account && user) {
        token.accessToken = account.access_token
        token.id = user.id
        const kc = decodeJwtPayload(account.access_token)
        if (kc) {
          const realmRoles: string[] = kc?.realm_access?.roles ?? []
          const clientId = process.env.KEYCLOAK_CLIENT_ID!
          const clientRoles: string[] =
            kc?.resource_access?.[clientId]?.roles ?? []
          const groups: string[] = kc?.groups ?? []

          token.roles = Array.from(new Set([...realmRoles, ...clientRoles]))
          token.groups = groups
        }
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.orcid = token.orcid as string
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
