import { jest } from '@jest/globals'
import { buildWebSocketURL } from './ws-url'

describe('ws-url helpers', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  describe('buildWebSocketURL (client-side)', () => {
    it('builds a full URL from window.env via getRuntimeEnv()', () => {
      const url = buildWebSocketURL()
      expect(url).toBe('ws://sovisuplus.example.com:3001/socket')
    })

    it('defaults WS_PATH to "/" when not provided', () => {
      if (window.env) {
        window.env.WS_PATH = ''
      }

      const url = buildWebSocketURL()
      expect(url).toBe('ws://sovisuplus.example.com:3001/')
    })
  })
})
