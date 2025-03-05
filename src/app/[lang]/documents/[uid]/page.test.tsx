import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import DocumentDetailsPage from './page'
import { notFound } from 'next/navigation'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { Person } from '@/types/Person'
import { LocRelator } from '@/types/LocRelator'

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
    palette: { primary: { main: '#1976d2' }, grey: { 300: '#f5f5f5' } },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: {
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      lineHeight: {
        lineHeight20px: '20px',
      },
    },
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

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  [
    new Literal('Sample Document Title', 'en'),
    new Literal('Sample Abstract', 'fr'),
  ],
  [new Literal('Sample Abstract', 'fr')],
  [], // empty subjects
  [
    new Contribution(
      new Person(
        'person-1',
        false,
        'john@example.com',
        'John Doe',
        'John',
        'Doe',
        [],
      ),
      [LocRelator.AUTHOR_OF_INTRODUCTION__ETC_],
    ),
  ],
)

const mockState = {
  document: {
    fetchDocumentById: jest.fn(),
    loading: false,
    selectedDocument: document,
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
      selector({
        document: {
          ...mockState.document,
          selectedDocument: null,
          hasFetched: true,
        },
      }),
    )

    renderComponent()
    expect(notFound).toHaveBeenCalled()
  })

  it('renders DocumentDetailsHeader and BibliographicInformation when document is found', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        document: { ...mockState.document, loading: false, hasFetched: true },
      }),
    )
    renderComponent()

    expect(
      screen.getByText('document_details_bibliographic_information_tab'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('document_details_keywords_tab'),
    ).toBeInTheDocument()
    expect(screen.getByText('document_details_domains_tab')).toBeInTheDocument()
    expect(screen.getByText('document_details_authors_tab')).toBeInTheDocument()
    expect(screen.getByText('document_details_sources_tab')).toBeInTheDocument()
  })
})
