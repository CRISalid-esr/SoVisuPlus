import { Account, AuthOptions, Profile, User as NextAuthUser, Session } from 'next-auth'
import KeycloakProvider, { KeycloakProfile } from 'next-auth/providers/keycloak'
import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { JWT } from 'next-auth/jwt'
import { Session as AuthUser  } from '@auth/core/types'


declare module '@auth/core/types' {
  interface User extends AuthUser {
    username?: string;
    orcid?: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
    };
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
        new PersonGraphQLClient(),
        new UserDAO(),
        new PersonDAO(),
      )
      const authenticationProfile: AuthenticationProfile = {
        username: (profile as KeycloakProfile)?.preferred_username,
        email: profile?.email,
        orcid: (profile as KeycloakProfile)?.orcid,
      }
      await userService.submitProfile(authenticationProfile)
      return true
    },
    async jwt({
      token,
      account,
      user,
      profile,
    }: {
      token: JWT
      account?: Account | null
      user?: NextAuthUser ,
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
