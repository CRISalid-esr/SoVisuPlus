import { chain } from '@/middlewares/chain'
import { localeMiddleware } from '@/middlewares/localeMiddleware'
import { authMiddleware } from '@/middlewares/authMiddleware'
import { callbackMiddleware } from '@/middlewares/callbackMiddleware'

export default chain([localeMiddleware, callbackMiddleware, authMiddleware])

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public|icons).*)'],
}
