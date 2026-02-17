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
    NEXT_PUBLIC_WS_SCHEME: process.env.NEXT_PUBLIC_WS_SCHEME,
    NEXT_PUBLIC_WS_HOST: process.env.NEXT_PUBLIC_WS_HOST,
    NEXT_PUBLIC_WS_PORT: process.env.NEXT_PUBLIC_WS_PORT,
    NEXT_PUBLIC_WS_PATH: process.env.NEXT_PUBLIC_WS_PATH,
    NEXT_PUBLIC_ORCID_URL: process.env.NEXT_PUBLIC_ORCID_URL,
    NEXT_PUBLIC_ORCID_CLIENT_ID: process.env.NEXT_PUBLIC_ORCID_CLIENT_ID,
    NEXT_PUBLIC_ORCID_SCOPES: process.env.NEXT_PUBLIC_ORCID_SCOPES,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_CAS_URL: process.env.NEXT_PUBLIC_CAS_URL,
  },
  writable: true,
})
