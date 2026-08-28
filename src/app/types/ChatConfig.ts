/**
 * Shape of the AI chat configuration file (`configs/chat.json`, overridable via the
 * `CHAT_CONFIG_FILE` env var / a `/config/chat.json` mount). It carries the agent system prompt
 * (server-only) plus the per-locale welcome message and default suggestions shown in the widget.
 */

export interface ChatWelcome {
  /** Conversation title for the seeded welcome thread. */
  title?: string
  /** Assistant message shown when the widget first opens. */
  message: string
}

export interface ChatSuggestion {
  /** Display label; falls back to `value` when omitted. */
  label?: string
  /** Text pre-filled/auto-submitted into the composer when the suggestion is clicked. */
  value: string
}

export interface ChatLocaleConfig {
  welcome?: ChatWelcome
  suggestions?: ChatSuggestion[]
}

export interface ChatConfig {
  /**
   * System prompt sent to the agent (as a `role:"system"` message) to shape its behaviour.
   * Server-only — never exposed to the browser.
   */
  systemPrompt?: string
  /** User-facing strings keyed by locale (e.g. `en`, `fr`). */
  locales?: Record<string, ChatLocaleConfig>
}

/**
 * Client-safe subset injected into the browser (`window.__SVP_CHAT_CONFIG__`). Excludes the
 * system prompt by construction.
 */
export interface ChatClientConfig {
  /** Whether the chat widget should be shown (agents API URL configured server-side). */
  enabled: boolean
  welcome: ChatWelcome | null
  suggestions: ChatSuggestion[]
}
