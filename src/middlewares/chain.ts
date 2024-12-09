import { NextMiddlewareResult } from 'next/dist/server/web/types'
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

export type CustomMiddleware = (
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse,
) => NextMiddlewareResult | Promise<NextMiddlewareResult>

type MiddlewareFactory = (middleware: CustomMiddleware) => CustomMiddleware

export function chain(
  functions: MiddlewareFactory[],
  index = 0,
): CustomMiddleware {
  const current = functions[index]

  if (current) {
    const next = chain(functions, index + 1)
    return (
      request: NextRequest,
      event: NextFetchEvent,
      response: NextResponse,
    ) => {
      return current(next)(request, event, response) // Pass the next function down the chain
    }
  }

  return (
    request: NextRequest,
    event: NextFetchEvent,
    response: NextResponse,
  ) => {
    return NextResponse.next() // Ensure we return the correct response
  }
}
