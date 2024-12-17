import { AuthOptions } from 'next-auth'
import KeycloakProvider from 'next-auth/providers/keycloak'

const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  session: {
    strategy: 'jwt', // Ensure you're using JWT sessions
  },
  callbacks: {
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
