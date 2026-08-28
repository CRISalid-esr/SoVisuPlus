import fs from 'node:fs/promises'
import path from 'node:path'
import type { ChatConfig, ChatSuggestion, ChatWelcome } from '@/types/ChatConfig'

/**
 * Server-side reader for the AI chat configuration file. Loads and caches `configs/chat.json`
 * (overridable via `CHAT_CONFIG_FILE`) and exposes the pieces the app needs: the system prompt
 * (injected server-side by the `/api/chat` proxy) and the per-locale welcome message + default
 * suggestions (shipped to the browser by the layout). Missing/invalid files degrade gracefully to
 * empty values so the widget still renders. Mirrors `ConceptFilterService`.
 */

const DEFAULT_LOCALE = 'en'

export class ChatConfigService {
  static fromFile(filePath: string) {
    return { build: () => new ChatConfigService(filePath) }
  }

  private config: ChatConfig | null = null
  private loaded = false
  private loadPromise: Promise<void> | null = null

  private constructor(private readonly filePath: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
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

  /** System prompt to send to the agent, trimmed. Empty string when unset. */
  public async getSystemPrompt(): Promise<string> {
    await this.ensureLoaded()
    return this.config?.systemPrompt?.trim() ?? ''
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

/** Resolves the config path: `CHAT_CONFIG_FILE` env wins, else `configs/chat.json` at the cwd. */
export const resolveChatConfigPath = (): string => {
  const fromEnv = process.env.CHAT_CONFIG_FILE?.trim()
  return fromEnv ? fromEnv : path.resolve(process.cwd(), 'configs/chat.json')
}

export const chatConfigService = ChatConfigService.fromFile(
  resolveChatConfigPath(),
).build()
