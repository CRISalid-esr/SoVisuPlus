import { isChatEnabledByEnv } from './chatEnabled'

describe('isChatEnabledByEnv', () => {
  const OLD_ENV = process.env

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('is enabled when CHAT_ENABLED is unset', () => {
    process.env = { ...OLD_ENV }
    delete process.env.CHAT_ENABLED
    expect(isChatEnabledByEnv()).toBe(true)
  })

  it.each(['', '   ', 'true', 'TRUE', 'yes', '0', 'no', 'falsey'])(
    'is enabled when CHAT_ENABLED is %p',
    (value) => {
      process.env = { ...OLD_ENV, CHAT_ENABLED: value }
      expect(isChatEnabledByEnv()).toBe(true)
    },
  )

  it.each(['false', 'FALSE', 'False', '  false  ', '\tFaLsE\n'])(
    'is disabled when CHAT_ENABLED is %p',
    (value) => {
      process.env = { ...OLD_ENV, CHAT_ENABLED: value }
      expect(isChatEnabledByEnv()).toBe(false)
    },
  )
})
