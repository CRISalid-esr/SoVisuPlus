import type { ChatClientConfig } from '@/types/ChatConfig'

const EMPTY: ChatClientConfig = {
  enabled: false,
  welcome: null,
  suggestions: [],
}

/**
 * Reads the client-safe chat config injected into `window.__SVP_CHAT_CONFIG__` by
 * `ChatConfigInjector`. Returns disabled/empty defaults on the server or before injection.
 */
export const getRuntimeChatConfig = (): ChatClientConfig =>
  typeof window !== 'undefined' && window.__SVP_CHAT_CONFIG__
    ? window.__SVP_CHAT_CONFIG__
    : EMPTY
