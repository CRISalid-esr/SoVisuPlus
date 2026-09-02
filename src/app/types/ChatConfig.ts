/**
 * Shape of the AI chat configuration file. The app resolves it via a cascade of candidates
 * (`CHAT_CONFIG_FILE` → `chat.json` → baked `chat.sample.json`; see `resolveChatConfigCandidates`),
 * using the first that loads to a usable config object — a JSON object with a `systemPrompt` key;
 * a null/empty/primitive/array file, or an object without `systemPrompt`, is skipped to the next
 * tier. It
 * carries the agent system prompt (server-only) plus the per-locale welcome message and default
 * suggestions shown in the widget.
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
   * May contain `{{variable}}` placeholders resolved server-side. Server-only — never exposed to
   * the browser.
   *
   * NB: a config **file** must include this key (its value may be empty, e.g. `""`) to be accepted
   * by `ChatConfigService` — it is the marker that distinguishes a real config from arbitrary JSON;
   * see `isUsableConfig`. The field stays optional here because consumers read it defensively
   * (`config?.systemPrompt?.trim()`).
   */
  systemPrompt?: string
  /**
   * Custom literal values for `{{key}}` placeholders in `systemPrompt`, declared by the deploying
   * admin in the config file. Merged over (and able to override) the app-provided defaults such as
   * `institutionName`.
   */
  variables?: Record<string, string>
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
