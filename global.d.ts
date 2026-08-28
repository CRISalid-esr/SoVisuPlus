import type { ChatClientConfig } from '@/types/ChatConfig'

export {}

declare global {
  interface Window {
    env?: Record<string, string>
    __SVP_CHAT_CONFIG__?: ChatClientConfig
  }
}
