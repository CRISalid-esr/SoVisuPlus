import { chain } from '@/middlewares/chain'
import { localeMiddleware } from '@/middlewares/localeMiddleware'
import { authMiddleware } from '@/middlewares/authMiddleware'

export default chain([localeMiddleware, authMiddleware])

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
