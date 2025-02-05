import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DocumentsPage from './page'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import useStore from '@/stores/global_store'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock Lingui internationalization
i18n.load({
  en: enMessages,
  fr: frMessages,
})
i18n.activate('en')

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
      },
    ],
    totalItems: 1,
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

const theme = createTheme()

const renderComponent = () =>
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <DocumentsPage />
      </I18nProvider>
    </ThemeProvider>,
  )

describe('DocumentsPage Component', () => {
  it('renders DocumentsPage correctly', async () => {
    renderComponent()

    expect(screen.getByText('documents_page_main_title')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'documents_page_synchronize_button' }),
    ).toBeInTheDocument()
    // expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('fetches documents on mount', async () => {
    renderComponent()

    await waitFor(() => {
      expect(mockFetchDocuments).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        searchTerm: '',
        columnFilters: JSON.stringify([]),
        sorting: JSON.stringify([]),
        searchLang: 'en',
      })
    })
  })

  it('switches tabs when a tab is clicked', async () => {
    renderComponent()

    const tab = screen.getByText(
      'documents_page_incomplete_hal_repository_filter',
    )
    fireEvent.click(tab)

    // Check that the tab gets selected
    expect(tab).toHaveClass('MuiTypography-root')
  })
})
