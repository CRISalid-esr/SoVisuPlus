import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

const pushMock = jest.fn()

jest.mock('@lingui/macro', () => {
  return {
    t: (key: string) => key, // return the key for testing
  }
})

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
}))

const theme = createTheme({
  typography: {
    fontWeightRegular: 400,
    lineHeight: { lineHeight24px: '24px' },
  },
  palette: {
    white: '#ffffff',
    primary: { main: '#1976d2' },
    background: { paper: '#ffffff' },
    primaryContainer: '#90caf9',
    onSurface: '#111111',
  },
  utils: { pxToRem: (v: number) => `${v / 16}rem` },
} as ThemeOptions)

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Provide supported locales via env
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'en,fr'

    // next/navigation mocks
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    const params = new URLSearchParams('foo=bar')
    const { useSearchParams } = jest.requireMock('next/navigation')
    ;(useSearchParams as jest.Mock).mockReturnValue(params)
  })

  it('renders with the current selected locale label', () => {
    renderWithTheme(<LanguageSwitcher value={'fr' as ExtendedLanguageCode} />)

    expect(screen.getByText('language_fr')).toBeInTheDocument()

    // Also shows the language icon
    expect(screen.getByAltText('language')).toBeInTheDocument()
  })

  it('lists supported locales when opened (scoped to listbox)', () => {
    renderWithTheme(<LanguageSwitcher value={'fr' as ExtendedLanguageCode} />)

    const combo = screen.getByRole('combobox', { name: /language switcher/i })
    fireEvent.mouseDown(combo) // open menu

    const listbox = screen.getByRole('listbox')

    expect(within(listbox).getByText('language_en')).toBeInTheDocument()
    expect(within(listbox).getByText('language_fr')).toBeInTheDocument()
  })

  it('navigates to the same path with the new lang and preserves query params', () => {
    renderWithTheme(<LanguageSwitcher value={'fr' as ExtendedLanguageCode} />)

    const button = screen.getByRole('combobox', { name: /language switcher/i })
    fireEvent.mouseDown(button)

    // Choose English
    const enOption = screen.getByText('language_en')
    fireEvent.click(enOption)

    // Should replace first segment (/fr/...) with /en, keep rest and query (?foo=bar)
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/en/documents?foo=bar')
  })
})
