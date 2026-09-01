import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ChatConfig, ChatSuggestion, ChatWelcome } from '@/types/ChatConfig'

/**
 * Server-side reader for the AI chat configuration file. Resolves the file via a cascade
 * (`CHAT_CONFIG_FILE` → `chat.json` → baked `chat.sample.json`; see `resolveChatConfigPath`), loads
 * and caches it, and exposes the pieces the app needs: the system prompt (injected server-side by
 * the `/api/chat` proxy, with `{{variable}}` placeholders resolved) and the per-locale welcome
 * message + default suggestions (shipped to the browser by the layout). When no file resolves the
 * config stays null and `isAvailable()` is false, so the widget is hidden. Mirrors
 * `ConceptFilterService`.
 */

const DEFAULT_LOCALE = 'en'

export class ChatConfigService {
  static fromFile(filePath: string | null) {
    return { build: () => new ChatConfigService(filePath) }
  }

  private config: ChatConfig | null = null
  private loaded = false
  private loadPromise: Promise<void> | null = null

  private constructor(private readonly filePath: string | null) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
      // No file resolved (none of the cascade paths exist) → leave config null (widget hidden).
      if (!this.filePath) {
        this.config = null
        this.loaded = true
        return
      }
      try {
        const raw = await fs.readFile(this.filePath, 'utf8')
        this.config = JSON.parse(raw) as ChatConfig
      } catch (error) {
        console.warn(
          `[ChatConfigService] Could not load ${this.filePath}. Proceeding with empty chat config.`,
          error instanceof Error ? error.message : error,
        )
        this.config = null
      } finally {
        this.loaded = true
      }
    })()
    return this.loadPromise
  }

  /** Whether a config file was resolved and parsed. When false, the chat widget is not shown. */
  public async isAvailable(): Promise<boolean> {
    await this.ensureLoaded()
    return this.config !== null
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
    return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '')
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
 * Resolves the config file via a cascade, returning the first path that exists, or `null` when
 * none do (→ widget hidden): `CHAT_CONFIG_FILE` (set by the deployment, e.g. `/config/chat.json`) →
 * `chat.json` at the cwd (env-specific live file) → baked `chat.sample.json`.
 */
export const resolveChatConfigPath = (): string | null => {
  const fromEnv = process.env.CHAT_CONFIG_FILE?.trim()
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  const live = path.resolve(process.cwd(), 'chat.json')
  if (existsSync(live)) return live
  const sample = path.resolve(process.cwd(), 'chat.sample.json')
  if (existsSync(sample)) return sample
  return null
}

export const chatConfigService = ChatConfigService.fromFile(
  resolveChatConfigPath(),
).build()
