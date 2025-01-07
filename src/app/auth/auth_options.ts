import { Account, AuthOptions, Profile, User as NextAuthUser } from 'next-auth'
import KeycloakProvider, { KeycloakProfile } from 'next-auth/providers/keycloak'
import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'

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
      return await userService.submitProfile(authenticationProfile)
    },
    async jwt(params) {
      console.info('jwt callback', params)
      const { token, account, user } = params
      if (account && user) {
        token.accessToken = account.access_token
        token.id = user.id
      }
      return token
    },
    async session(params) {
      console.info('session callback', params)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { session, token } = params as any

      if (token) {
        session.user.id = token.id
        session.accessToken = token.accessToken
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
