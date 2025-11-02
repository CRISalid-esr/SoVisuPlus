import fs from 'node:fs/promises'
import path from 'node:path'

export class ConceptFilterService {
  static exclusionFilePath(filePath: string) {
    return {
      build: () => new ConceptFilterService({ filePath }),
    }
  }

  static exclusionList(lines: string[]) {
    return {
      build: () => new ConceptFilterService({ lines }),
    }
  }

  static build() {
    return new ConceptFilterService()
  }

  private exact: Set<string> = new Set()
  private prefixes: string[] = []
  private loaded = false
  private loadPromise: Promise<void> | null = null
  private filePath?: string

  private constructor(opts?: { filePath?: string; lines?: string[] }) {
    if (opts?.lines) {
      this.parseLines(opts.lines)
      this.loaded = true
    }
    this.filePath = opts?.filePath
  }

  public matchesRegexPattern(
    uri: string | null | undefined,
    re: RegExp,
  ): boolean {
    if (!uri) return false
    try {
      return re.test(uri)
    } catch {
      return false
    }
  }

  public async matchesLabelList(
    uri: string | null | undefined,
  ): Promise<boolean> {
    if (!uri) return false
    await this.ensureLoaded()
    if (this.exact.has(uri)) return true
    for (const p of this.prefixes) if (uri.startsWith(p)) return true
    return false
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    if (this.filePath) {
      this.loadPromise = (async () => {
        try {
          const raw = await fs.readFile(this.filePath!, 'utf8')
          this.parseLines(raw.split(/\r?\n/))
        } catch {
          console.warn(
            `[ConceptFilterService] Could not load ${this.filePath}. Proceeding with empty list.`,
          )
          this.exact = new Set()
          this.prefixes = []
        } finally {
          this.loaded = true
        }
      })()
      return this.loadPromise
    }

    // no filepath = nothing to load
    this.loaded = true
  }

  private parseLines(lines: string[]) {
    const nextExact = new Set<string>()
    const nextPrefixes: string[] = []
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      if (line.endsWith('*')) {
        const prefix = line.slice(0, -1).trim()
        if (prefix) nextPrefixes.push(prefix)
      } else {
        nextExact.add(line)
      }
    }
    this.exact = nextExact
    this.prefixes = nextPrefixes
  }
}

const DEFAULT_EXCLUSION_FILE = path.resolve(
  process.cwd(),
  'configs/concept_exclusion.txt',
)
export const conceptFilterService = ConceptFilterService.exclusionFilePath(
  DEFAULT_EXCLUSION_FILE,
).build()
