import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ChatConfigService, resolveChatConfigPath } from './ChatConfigService'

jest.mock('node:fs', () => ({ existsSync: jest.fn() }))
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>

const writeFixture = async (content: unknown): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chatcfg-'))
  const file = path.join(dir, 'chat.json')
  await fs.writeFile(file, JSON.stringify(content), 'utf8')
  return file
}

const SAMPLE = {
  systemPrompt: '  Be concise. No jokes.  ',
  locales: {
    en: {
      welcome: { title: 'Welcome', message: 'Hi!' },
      suggestions: [{ label: 'Pubs', value: 'Show my publications.' }],
    },
    fr: {
      welcome: { title: 'Bienvenue', message: 'Bonjour !' },
      suggestions: [{ label: 'Pubs', value: 'Montre mes publications.' }],
    },
  },
}

describe('ChatConfigService', () => {
  it('returns the trimmed system prompt', async () => {
    const file = await writeFixture(SAMPLE)
    const service = ChatConfigService.fromFile(file).build()
    expect(await service.getSystemPrompt()).toBe('Be concise. No jokes.')
  })

  it('returns an empty prompt when none is set', async () => {
    const file = await writeFixture({ locales: {} })
    const service = ChatConfigService.fromFile(file).build()
    expect(await service.getSystemPrompt()).toBe('')
  })

  it('returns the welcome and suggestions for the requested locale', async () => {
    const file = await writeFixture(SAMPLE)
    const service = ChatConfigService.fromFile(file).build()
    const fr = await service.getClientConfig('fr')
    expect(fr.welcome).toEqual({ title: 'Bienvenue', message: 'Bonjour !' })
    expect(fr.suggestions).toEqual([
      { label: 'Pubs', value: 'Montre mes publications.' },
    ])
  })

  it('falls back to the en locale for an unknown locale', async () => {
    const file = await writeFixture(SAMPLE)
    const service = ChatConfigService.fromFile(file).build()
    const de = await service.getClientConfig('de')
    expect(de.welcome).toEqual({ title: 'Welcome', message: 'Hi!' })
  })

  it('returns empty defaults when neither the locale nor en exists', async () => {
    const file = await writeFixture({ systemPrompt: 'x', locales: {} })
    const service = ChatConfigService.fromFile(file).build()
    const en = await service.getClientConfig('en')
    expect(en).toEqual({ welcome: null, suggestions: [] })
  })

  it('degrades gracefully when the file is missing', async () => {
    const service = ChatConfigService.fromFile('/no/such/chat.json').build()
    expect(await service.getSystemPrompt()).toBe('')
    expect(await service.getClientConfig('en')).toEqual({
      welcome: null,
      suggestions: [],
    })
  })

  it('degrades gracefully when the file is invalid JSON', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'chatcfg-'))
    const file = path.join(dir, 'chat.json')
    await fs.writeFile(file, '{ not valid json', 'utf8')
    const service = ChatConfigService.fromFile(file).build()
    expect(await service.getSystemPrompt()).toBe('')
  })

  describe('{{variable}} interpolation in the system prompt', () => {
    const OLD_ENV = process.env
    afterEach(() => {
      process.env = OLD_ENV
    })

    it('substitutes {{institutionName}} from NEXT_PUBLIC_INSTITUTION_NAME', async () => {
      process.env = { ...OLD_ENV, NEXT_PUBLIC_INSTITUTION_NAME: 'Panthéon-Sorbonne' }
      const file = await writeFixture({
        systemPrompt: 'Assistant for {{institutionName}}.',
      })
      const service = ChatConfigService.fromFile(file).build()
      expect(await service.getSystemPrompt()).toBe(
        'Assistant for Panthéon-Sorbonne.',
      )
    })

    it('resolves a file-declared variable and lets it override an app default', async () => {
      process.env = { ...OLD_ENV, NEXT_PUBLIC_INSTITUTION_NAME: 'Default U' }
      const file = await writeFixture({
        systemPrompt: '{{institutionName}} — contact {{supportEmail}}.',
        variables: { institutionName: 'Override U', supportEmail: 'x@y.fr' },
      })
      const service = ChatConfigService.fromFile(file).build()
      expect(await service.getSystemPrompt()).toBe(
        'Override U — contact x@y.fr.',
      )
    })

    it('collapses an unknown placeholder to an empty string', async () => {
      const file = await writeFixture({ systemPrompt: 'A{{nope}}B' })
      const service = ChatConfigService.fromFile(file).build()
      expect(await service.getSystemPrompt()).toBe('AB')
    })
  })

  describe('isAvailable', () => {
    it('is true when a file resolves and parses', async () => {
      const file = await writeFixture(SAMPLE)
      const service = ChatConfigService.fromFile(file).build()
      expect(await service.isAvailable()).toBe(true)
    })

    it('is false when the path is null', async () => {
      const service = ChatConfigService.fromFile(null).build()
      expect(await service.isAvailable()).toBe(false)
    })

    it('is false when the file is missing or invalid', async () => {
      const service = ChatConfigService.fromFile('/no/such/chat.json').build()
      expect(await service.isAvailable()).toBe(false)
    })
  })
})

describe('resolveChatConfigPath', () => {
  const OLD_ENV = process.env
  const LIVE = path.resolve(process.cwd(), 'chat.json')
  const SAMPLE_PATH = path.resolve(process.cwd(), 'chat.sample.json')

  beforeEach(() => {
    mockExistsSync.mockReset()
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('uses CHAT_CONFIG_FILE when it is set and the file exists', () => {
    process.env = { ...OLD_ENV, CHAT_CONFIG_FILE: '/config/chat.json' }
    mockExistsSync.mockImplementation((p) => p === '/config/chat.json')
    expect(resolveChatConfigPath()).toBe('/config/chat.json')
  })

  it('falls through to chat.json when CHAT_CONFIG_FILE points at a missing file', () => {
    process.env = { ...OLD_ENV, CHAT_CONFIG_FILE: '/config/chat.json' }
    mockExistsSync.mockImplementation((p) => p === LIVE)
    expect(resolveChatConfigPath()).toBe(LIVE)
  })

  it('uses chat.json when the env var is unset and chat.json exists', () => {
    const env = { ...OLD_ENV }
    delete env.CHAT_CONFIG_FILE
    process.env = env
    mockExistsSync.mockImplementation((p) => p === LIVE)
    expect(resolveChatConfigPath()).toBe(LIVE)
  })

  it('falls back to chat.sample.json when only the sample exists', () => {
    const env = { ...OLD_ENV }
    delete env.CHAT_CONFIG_FILE
    process.env = env
    mockExistsSync.mockImplementation((p) => p === SAMPLE_PATH)
    expect(resolveChatConfigPath()).toBe(SAMPLE_PATH)
  })

  it('returns null when no file exists anywhere', () => {
    process.env = { ...OLD_ENV, CHAT_CONFIG_FILE: '   ' }
    mockExistsSync.mockReturnValue(false)
    expect(resolveChatConfigPath()).toBeNull()
  })
})
