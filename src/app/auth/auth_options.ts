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
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id
        session.accessToken = token.accessToken
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // add /redirect to the url and keep path params
      return url.startsWith(baseUrl) ? url : `${baseUrl}/redirect${url}`
    },
  },
  pages: {
    signIn: '/[locale]/api/auth/providers',
  },
}
export default authOptions
