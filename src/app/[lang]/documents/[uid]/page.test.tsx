import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { notFound } from 'next/navigation'
import DocumentDetailsPage from './page'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock Lingui `t` function
jest.mock('@lingui/macro', () => ({
  t: (key: string) => key, // Return key directly for testing
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

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ uid: '123' })),
  useSearchParams: jest.fn(
    () => new URLSearchParams('?tab=bibliographic_information'),
  ),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
  notFound: jest.fn(),
}))

// Initialize Lingui i18n
i18n.load({ en: enMessages, fr: frMessages })
i18n.activate('en')

// Mock document data
const mockState = {
  document: {
    fetchDocumentById: jest.fn(),
    loading: false,
    selectedDocument: {
      uid: '123',
      title: 'Sample Document',
    },
  },
}

describe('DocumentDetailsPage Component', () => {
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
          <DocumentDetailsPage />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders loading state', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ document: { ...mockState.document, loading: true } }),
    )

    renderComponent()
    expect(screen.getByRole('progressbar')).toBeInTheDocument() // CircularProgress should be visible
  })

  it('calls notFound if document is missing', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ document: { ...mockState.document, selectedDocument: null } }),
    )

    renderComponent()
    expect(notFound).toHaveBeenCalled()
  })

  it('renders DocumentDetailsHeader and BibliographicInformation when document is found', () => {
    renderComponent()

    expect(
      screen.getByText('document_details_bibliographic_information_tab'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('document_details_keywords_tab'),
    ).toBeInTheDocument()
    expect(screen.getByText('document_details_domains_tab')).toBeInTheDocument()
    expect(screen.getByText('document_details_authors_tab')).toBeInTheDocument()
    expect(
      screen.getByText('document_details_HAL_referencing_tab'),
    ).toBeInTheDocument()
  })
})
