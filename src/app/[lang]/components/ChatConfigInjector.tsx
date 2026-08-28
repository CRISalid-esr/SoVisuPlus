import React from 'react'
import type { ChatClientConfig } from '@/types/ChatConfig'

type ChatConfigInjectorProps = {
  config: ChatClientConfig
}

/**
 * Serialises the client-safe chat config into `window.__SVP_CHAT_CONFIG__` at runtime, mirroring
 * `EnvInjector`. Only the `ChatClientConfig` subset is exposed — the agent system prompt stays on
 * the server.
 */
export const ChatConfigInjector: React.FC<ChatConfigInjectorProps> = ({
  config,
}) => (
  <script
    dangerouslySetInnerHTML={{
      __html: `window.__SVP_CHAT_CONFIG__ = ${JSON.stringify(config)};`,
    }}
  />
)
