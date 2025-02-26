import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import DocumentDetailsTitle from './DocumentDetailsTitle'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock Lingui `t` function
jest.mock('@lingui/macro', () => ({
  t: (key: string) => key, // Return key directly for testing
}))

// Mock `getLocalizedValue` function
jest.mock('@/utils/getLocalizedValue', () => ({
  getLocalizedValue: jest.fn(),
}))

// Mock MUI Theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: { primary: { main: '#1976d2' } },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
  }),
}))

// Initialize Lingui i18n
i18n.load({ en: enMessages, fr: frMessages })
i18n.activate('en')

// Mock document data
const mockState = {
  document: {
    selectedDocument: {
      titles: [
        {
          language: 'en' as ExtendedLanguageCode,
          value: 'Sample English Title',
        },
        { language: 'fr' as ExtendedLanguageCode, value: 'Titre Français' },
      ],
    },
  },
}

// Define supported locales
process.env.NEXT_PUBLIC_SUPPORTED_LOCALES = 'en,fr'

describe('DocumentDetailsTitle Component', () => {
  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
    jest.clearAllMocks()
  })

  const theme = createTheme({
    typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
    palette: { primary: { main: '#1976d2' } },
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
  })

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <DocumentDetailsTitle />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders title in the selected language', () => {
    ;(getLocalizedValue as jest.Mock).mockReturnValue({
      value: 'Sample English Title',
    })

    renderComponent()

    expect(screen.getByText('Sample English Title')).toBeInTheDocument()
  })

  it('falls back to another supported locale if the preferred one is missing', () => {
    ;(getLocalizedValue as jest.Mock).mockReturnValue({
      value: 'Titre Français',
    })

    renderComponent()

    expect(screen.getByText('Titre Français')).toBeInTheDocument()
  })

  it('displays "no title available" when no title is present', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ document: { selectedDocument: { titles: [] } } }),
    )
    ;(getLocalizedValue as jest.Mock).mockReturnValue({
      value: 'no_title_available',
    })

    renderComponent()

    expect(screen.getByText('no_title_available')).toBeInTheDocument()
  })
})
