import fs from 'node:fs/promises'
import path from 'node:path'
import type {
  ChatConfig,
  ChatSuggestion,
  ChatWelcome,
} from '@/types/ChatConfig'
import { isChatEnabledByEnv } from '@/utils/chatEnabled'

/**
 * Server-side reader for the AI chat configuration file. Tries a cascade of candidates in priority
 * order (`CHAT_CONFIG_FILE` → `chat.json` → baked `chat.sample.json`; see
 * `resolveChatConfigCandidates`) and uses the first that loads to a **usable config object** (a JSON
 * object with a `systemPrompt` key) — a present-but-null/empty/primitive/array file, or an object
 * without `systemPrompt`, is skipped to the next tier rather than hiding the widget. It exposes the
 * pieces the app needs: the system prompt (injected server-side by the `/api/chat` proxy, with
 * `{{variable}}` placeholders resolved) and the per-locale welcome message + default suggestions
 * (shipped to the browser by the layout). When no candidate loads the config stays null and
 * `isAvailable()` is false, so the widget is hidden. `isChatEnabled()` is the single gate used by
 * both the layout (widget) and the `/api/chat` proxy. Mirrors `ConceptFilterService`.
 */

const DEFAULT_LOCALE = 'en'

/**
 * A parsed candidate is usable only if it is a JSON object with a `systemPrompt` key present. This
 * rejects unusable top-level content (`null`, arrays, primitives, `{}`, or an object without
 * `systemPrompt`) so the cascade falls through to the next tier. The key's value may be empty.
 */
const isUsableConfig = (value: unknown): value is ChatConfig =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'systemPrompt' in value

export class ChatConfigService {
  static fromFiles(filePaths: string[]) {
    return { build: () => new ChatConfigService(filePaths) }
  }

  static fromFile(filePath: string | null) {
    return ChatConfigService.fromFiles(filePath ? [filePath] : [])
  }

  private config: ChatConfig | null = null
  private loaded = false
  private loadPromise: Promise<void> | null = null
  // Last disabled reason logged, so the layout and the proxy do not repeat it on every call.
  private loggedDisabledReason: string | null = null

  private constructor(private readonly filePaths: string[]) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
      // Use the first candidate that loads; skip any that is missing or invalid. When none load,
      // config stays null (widget hidden).
      this.config = null
      for (const filePath of this.filePaths) {
        try {
          const parsed = JSON.parse(
            await fs.readFile(filePath, 'utf8'),
          ) as unknown
          if (isUsableConfig(parsed)) {
            this.config = parsed
            break
          }
          console.warn(
            `[ChatConfigService] Skipping ${filePath} (not a usable chat config).`,
          )
        } catch (error) {
          console.warn(
            `[ChatConfigService] Skipping ${filePath} (missing or invalid).`,
            error instanceof Error ? error.message : error,
          )
        }
      }
      this.loaded = true
    })()
    return this.loadPromise
  }

  /** Whether a config file was resolved and parsed. When false, the chat widget is not shown. */
  public async isAvailable(): Promise<boolean> {
    await this.ensureLoaded()
    return this.config !== null
  }

  /**
   * Whether the AI chat is usable: `CHAT_ENABLED` is not `false`, `CRISALID_AGENTS_API_URL` is set
   * and a chat config file resolved. When it is not, the reason is logged once (until it changes)
   * so an admin can tell why the chat is missing.
   */
  public async isChatEnabled(): Promise<boolean> {
    const reason = await this.getDisabledReason()
    if (reason === null) {
      this.loggedDisabledReason = null
      return true
    }
    if (reason !== this.loggedDisabledReason) {
      console.warn(`[ChatConfigService] AI chat is disabled: ${reason}`)
      this.loggedDisabledReason = reason
    }
    return false
  }

  private async getDisabledReason(): Promise<string | null> {
    if (!isChatEnabledByEnv()) return 'CHAT_ENABLED is set to false.'
    if (!process.env.CRISALID_AGENTS_API_URL?.trim()) {
      return 'CRISALID_AGENTS_API_URL is not set.'
    }
    if (!(await this.isAvailable())) {
      return `no usable chat config file found (tried: ${this.filePaths.join(', ') || 'none'}).`
    }
    return null
  }

  /**
   * App-provided default variables plus the config file's custom `variables`, the latter winning.
   * App defaults source the (unprefixed) deploy env mapped into the app — e.g. `institutionName`
   * comes from `NEXT_PUBLIC_INSTITUTION_NAME` — so admins never re-type them in the file.
   */
  private buildVariables(): Record<string, string> {
    return {
      institutionName: process.env.NEXT_PUBLIC_INSTITUTION_NAME ?? '',
      ...(this.config?.variables ?? {}),
    }
  }

  /**
   * System prompt to send to the agent, trimmed and with `{{variable}}` placeholders substituted.
   * Unknown placeholders collapse to an empty string. Empty string when no prompt is set.
   */
  public async getSystemPrompt(): Promise<string> {
    await this.ensureLoaded()
    const raw = this.config?.systemPrompt?.trim() ?? ''
    if (!raw) return ''
    const vars = this.buildVariables()
    return raw.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (_, key: string) => vars[key] ?? '',
    )
  }

  /**
   * Client-facing strings for the given locale, falling back to `en` then to empty values.
   * Never includes the system prompt.
   */
  public async getClientConfig(
    locale: string,
  ): Promise<{ welcome: ChatWelcome | null; suggestions: ChatSuggestion[] }> {
    await this.ensureLoaded()
    const locales = this.config?.locales ?? {}
    const localeConfig = locales[locale] ?? locales[DEFAULT_LOCALE] ?? {}
    return {
      welcome: localeConfig.welcome ?? null,
      suggestions: localeConfig.suggestions ?? [],
    }
  }
}

/**
 * Ordered config-file candidates (highest priority first); the service uses the first that loads
 * (exists and parses): `CHAT_CONFIG_FILE` (set by the deployment, e.g. `/config/chat.json`) →
 * `chat.json` at the cwd (env-specific live file) → baked `chat.sample.json`.
 */
export const resolveChatConfigCandidates = (): string[] => {
  const candidates: string[] = []
  const fromEnv = process.env.CHAT_CONFIG_FILE?.trim()
  if (fromEnv) candidates.push(fromEnv)
  candidates.push(path.resolve(process.cwd(), 'chat.json'))
  candidates.push(path.resolve(process.cwd(), 'chat.sample.json'))
  return candidates
}

export const chatConfigService = ChatConfigService.fromFiles(
  resolveChatConfigCandidates(),
).build()
