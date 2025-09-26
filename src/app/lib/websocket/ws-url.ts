import { getRuntimeEnv } from '@/utils/runtimeEnv'

/**
 * Client-side only: builds full WebSocket URL from window.env
 * (injected by EnvInjector component at runtime)
 */
export function buildWebSocketURL(): string {
  const scheme = getRuntimeEnv().WS_SCHEME
  const host = getRuntimeEnv().WS_HOST
  const port = getRuntimeEnv().WS_PORT
  const path = getRuntimeEnv().WS_PATH || '/'

  if (!scheme || !host || !port) {
    throw new Error('WS env missing: WS_SCHEME, WS_HOST, WS_PORT are required')
  }

  return `${scheme}://${host}:${port}${path}`
}
