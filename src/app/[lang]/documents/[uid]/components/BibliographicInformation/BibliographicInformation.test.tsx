import DateProvider from '@/components/DateProvider'
import useStore from '@/stores/global_store'
import { Contribution } from '@/types/Contribution'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { Journal } from '@/types/Journal'
import { JournalIdentifier } from '@/types/JournalIdentifier'
import { Literal } from '@/types/Literal'
import { LocRelator } from '@/types/LocRelator'
import { Person } from '@/types/Person'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import BibliographicInformation from './BibliographicInformation'
// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock MUI Theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: { primary: { main: '#1976d2' }, grey: { 300: '#ddd' } },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: {
      fontWeightRegular: 400,
      lineHeight: {
        lineHeight20px: '20px',
      },
    },
  }),
}))

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  [new Literal('Sample Document Title', 'en')],
  [new Literal('Sample Abstract', 'en')],
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
  [],
  DocumentState.default,
  new Journal('Test journal', '0123-4567', 'Test publisher', [
    new JournalIdentifier('issn', '0123-4567', 'Online'),
  ]),
)

describe('BibliographicInformation Component', () => {
  const mockState = {
    document: {
      selectedDocument: document,
    },
  }

  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
  })

  const theme = createTheme({
    typography: { fontWeightRegular: 400 },
    palette: { primary: { main: '#1976d2' }, grey: { 300: '#ddd' } },
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
  })

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <DateProvider>
            <BibliographicInformation />
          </DateProvider>
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders the component with a title and button', () => {
    renderComponent()

    expect(
      screen.getByText(i18n.t('document_details_page_card_title')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('document_details_page_card_validate_button')),
    ).toBeInTheDocument()
  })

  it('renders document fields based on selected document', () => {
    renderComponent()

    expect(
      screen.getByText(i18n.t('document_details_page_titles_row_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('document_details_page_type_row_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('document_details_page_authors_row_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        i18n.t('document_details_page_publication_date_row_label'),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('document_details_page_journal_row_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('document_details_page_abstracts_row_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('document_details_page_sources_row_label')),
    ).toBeInTheDocument()
  })

  it('handles button click', () => {
    renderComponent()

    const validateButton = screen.getByText(
      i18n.t('document_details_page_card_validate_button'),
    )
    fireEvent.click(validateButton)

    // No real action expected yet, but we confirm it exists and is clickable
    expect(validateButton).toBeInTheDocument()
  })
})
