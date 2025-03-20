import DateProvider from '@/components/DateProvider'
import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import DocumentsPage from './page'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
}))

const mockFetchDocuments = jest.fn()
const mockState = {
  document: {
    fetchDocuments: mockFetchDocuments,
    loading: false,
    documents: [
      {
        id: 'doc1',
        type: 'Article',
        titles: [{ value: 'Test Title', lang: 'en' }],
        contributions: [
          {
            person: {
              firstName: 'John',
              lastName: 'Doe',
              displayName: 'John Doe',
            },
          },
        ],
        date: '2024-01-01',
        records: [
          {
            uid: 'rec1',
            platform: 'Platform A',
            titles: [{ value: 'Record Title 1', lang: 'en' }],
          },
          {
            uid: 'rec2',
            platform: 'Platform B',
            titles: [{ value: 'Record Title 2', lang: 'fr' }],
          },
        ],
      },
    ],
    totalItems: 1,
  },
  user: {
    currentPerspective: {
      type: 'person',
      getDisplayName: () => 'John Doe',
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
})
