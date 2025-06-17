import DateProvider from '@/components/DateProvider'
import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Document, DocumentType } from '@/types/Document'
import DocumentsPage from './page'
import { Literal } from '@/types/Literal'
import { InternalPerson } from '@/types/InternalPerson'
import { DocumentRecord } from '@/types/DocumentRecord'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { Contribution } from '@/types/Contribution'
import { LocRelator } from '@/types/LocRelator'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(
    () => new URLSearchParams('?perspective=person:john-doe'),
  ),
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
}))

const mockFetchDocuments = jest.fn()
const mockFetchDocumentById = jest.fn()
const mockState = {
  document: {
    fetchDocuments: mockFetchDocuments,
    fetchDocumentById: mockFetchDocumentById,
    loading: false,
    documents: [
      new Document(
        'doc1',
        DocumentType.JournalArticle,
        '2024-01-01',
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        [new Literal('Test Title', 'en')],
        [new Literal('Test Abstract', 'en')],
        [],
        [
          new Contribution(
            new InternalPerson('person-1', null, 'John Doe', 'John', 'Doe', []),
            [LocRelator.AUTHOR],
          ),
        ],
        [
          new DocumentRecord(
            'rec1',
            BibliographicPlatform.HAL,
            [new Literal('Record Title 1', 'en')],
            'https://url-to-record-1',
          ),
          new DocumentRecord(
            'rec2',
            BibliographicPlatform.OPENALEX,
            [new Literal('Record Title 2', 'fr')],
            'https://url-to-record-2',
          ),
        ],
      ),
    ],
    totalItems: 1,
  },
  user: {
    currentPerspective: {
      type: 'person',
      getDisplayName: () => 'John Doe',
      memberships: [],
    },
  },
}
beforeEach(() => {
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector(mockState),
  )

  // Ensure the mock fetchDocuments returns a Promise (resolved or rejected)
  mockFetchDocuments.mockResolvedValue({
    data: [],
    totalItems: 0,
  })
})

const theme = createTheme({
  typography: {
    fontWeightRegular: 400,
    lineHeight: { lineHeight24px: '24px' },
  },
  palette: {
    white: '#ffffff',
    primary: { main: '#1976d2' },
    background: { paper: '#ffffff' },
  },
  utils: {
    pxToRem: (value: number) => `${value / 16}rem`,
  },
} as ThemeOptions)

const renderComponent = () =>
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <DateProvider>
          <DocumentsPage />
        </DateProvider>
      </I18nProvider>
    </ThemeProvider>,
  )

describe('DocumentsPage Component', () => {
  it('renders DocumentsPage correctly', async () => {
    renderComponent()

    expect(
      screen.getByText((content) =>
        content.startsWith(i18n.t('documents_page_main_title')),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_synchronize_button')),
    ).toBeInTheDocument()
  })

  it('fetches documents on mount', async () => {
    renderComponent()

    await waitFor(() => {
      expect(mockFetchDocuments).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        searchTerm: '',
        columnFilters: JSON.stringify([]),
        sorting: JSON.stringify([
          {
            id: 'date',
            desc: true,
          },
        ]),
        searchLang: 'en',
        contributorType: 'person',
        contributorUid: '',
        requestId: 1,
      })
    })
  })

  it('switches tabs when a tab is clicked', async () => {
    renderComponent()

    const tab = screen.getByText(
      i18n.t('documents_page_incomplete_hal_repository_filter'),
    )
    fireEvent.click(tab)

    // Check that the tab gets selected
    expect(tab).toHaveClass('MuiTypography-root')
  })

  it('renders the document list', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('01-01-2024')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Hal' })).toHaveAttribute(
        'href',
        'https://url-to-record-1/',
      )
      expect(screen.getByRole('link', { name: 'OpenAlex' })).toHaveAttribute(
        'href',
        'https://url-to-record-2/',
      )
    })
  })

  it('navigate to the document page if the user clicks on the title', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Test Title'))
    })
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/documents/doc1?perspective=person%3Ajohn-doe&tab=bibliographic_information',
      ),
    )
  })
})
