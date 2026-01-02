import { getRuntimeEnv } from '@/utils/runtimeEnv'

/**
 * Client-side only: builds full WebSocket URL from window.env
 * (injected by EnvInjector component at runtime)
 */
export const buildWebSocketURL = (): string => {
  const scheme = getRuntimeEnv().WS_SCHEME
  const host = getRuntimeEnv().WS_HOST
  const port = getRuntimeEnv().WS_PORT
  const path = getRuntimeEnv().WS_PATH || '/'

  if (!scheme || !host) {
    throw new Error('WS env missing: WS_SCHEME, WS_HOST are required')
  }

  // If scheme is ws, and port is 80, omit the port
  // If scheme is wss, and port is 443, omit the port
  if (
    (scheme === 'ws' && port === '80') ||
    (scheme === 'wss' && port === '443')
  ) {
    return `${scheme}://${host}${path}`
  }

  return `${scheme}://${host}:${port}${path}`
}
