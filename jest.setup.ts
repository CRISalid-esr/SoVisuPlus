import { i18n } from '@lingui/core'
import '@testing-library/jest-dom'
import fetch from 'cross-fetch'

beforeEach(() => {
  jest.spyOn(i18n, 'locale', 'get').mockReturnValue('en')
})

global.fetch = fetch

// as EnvInjector is not called in tests, we need to mock window.env here
Object.defineProperty(window, 'env', {
  value: {
    WS_SCHEME: process.env.WS_SCHEME,
    WS_HOST: process.env.WS_HOST,
    WS_PORT: process.env.WS_PORT,
    WS_PATH: process.env.WS_PATH,
    ORCID_URL: process.env.ORCID_URL,
    ORCID_CLIENT_ID: process.env.ORCID_CLIENT_ID,
    ORCID_SCOPES: process.env.ORCID_SCOPES,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_CAS_URL: process.env.NEXT_PUBLIC_CAS_URL,
  },
  writable: true,
})
