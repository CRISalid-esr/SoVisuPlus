import { Account, AuthOptions, Profile, User } from 'next-auth'
import KeycloakProvider, { KeycloakProfile } from 'next-auth/providers/keycloak'
import { UserService } from '@/lib/services/UserService'
import { AuthenticationProfile } from '@/types/AuthenticationProfile'
import { CredentialInput } from 'next-auth/providers/credentials'

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
    /* eslint-disable @typescript-eslint/no-unused-vars */
    async signIn({
      user,
      account,
      profile,
      email,
      credentials,
    }: {
      user: User
      account: Account | null
      profile?: Profile
      email?: { verificationRequest?: boolean }
      credentials?: Record<string, CredentialInput>
    }) {
      console.info('signIn callback', user, account, profile)
      const personService = new UserService()
      const authenticationProfile: AuthenticationProfile = {
        username: (profile as KeycloakProfile)?.preferred_username,
        email: profile?.email,
        orcid: (profile as KeycloakProfile)?.orcid,
      }
      return await personService.submitProfile(authenticationProfile)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
