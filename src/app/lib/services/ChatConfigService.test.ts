import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ChatConfigService, resolveChatConfigPath } from './ChatConfigService'

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
})

describe('resolveChatConfigPath', () => {
  const OLD_ENV = process.env

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('honours the CHAT_CONFIG_FILE env var', () => {
    process.env = { ...OLD_ENV, CHAT_CONFIG_FILE: '/config/chat.json' }
    expect(resolveChatConfigPath()).toBe('/config/chat.json')
  })

  it('defaults to configs/chat.json under the cwd', () => {
    process.env = { ...OLD_ENV, CHAT_CONFIG_FILE: '' }
    expect(resolveChatConfigPath()).toBe(
      path.resolve(process.cwd(), 'configs/chat.json'),
    )
  })
})
