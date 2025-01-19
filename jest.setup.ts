import { i18n } from '@lingui/core'
import '@testing-library/jest-dom'
import fetch from 'cross-fetch'

beforeEach(() => {
  jest.spyOn(i18n, 'locale', 'get').mockReturnValue('en')
})

global.fetch = fetch
