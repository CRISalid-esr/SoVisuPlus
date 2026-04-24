import MergeDialogDocument from '@/app/[lang]/documents/components/MergeDialogDocument'
import { fireEvent, render, screen } from '@testing-library/react'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { OAStatus, SourceRecordType } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { DocumentRecord } from '@/types/DocumentRecord'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { Contribution } from '@/types/Contribution'
import { Person } from '@/types/Person'
import { LocRelator } from '@/types/LocRelator'
import { Journal } from '@/types/Journal'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { createTheme, ThemeProvider } from '@mui/material/styles'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams('')),
}))

const theme = createTheme({
  typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
  palette: { primary: { main: '#1976d2' } },
  utils: { pxToRem: (value: number) => `${value / 16}rem` },
})

const mockDocument = new Document(
  'doc1',
  DocumentType.Book,
  OAStatus.CLOSED,
  '2024-01-13',
  new Date('2024-01-01'),
  new Date('2024-01-01'),
  OAStatus.CLOSED,
  [new Literal('Exemple de titre', 'fr'), new Literal('Test Title', 'en')],
  [new Literal('Test Abstract', 'en')],
  [],
  [],
  [
    new DocumentRecord(
      'rec1',
      'hal-001',
      [],
      [],
      [SourceRecordType.Book],
      new Date('2024-01-01'),
      BibliographicPlatform.HAL,
      [new Literal('Record Title 1', 'en')],
    ),
    new DocumentRecord(
      'rec2',
      'hal-002',
      [],
      [],
      [SourceRecordType.Image],
      new Date('2024-01-01'),
      BibliographicPlatform.OPENALEX,
      [new Literal('Record Title 2', 'fr')],
    ),
  ],
)

const mockDocumentWithJournal = new Document(
  'doc2',
  DocumentType.JournalArticle,
  OAStatus.CLOSED,
  null,
  new Date('2025-01-01'),
  new Date('2025-01-01'),
  OAStatus.CLOSED,
  [new Literal('Test Title 2', 'en')],
  [new Literal('Test Abstract 2', 'en')],
  [],
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
      [LocRelator.AUTHOR],
    ),
    new Contribution(
      new Person(
        'person-2',
        true,
        'mariedupuis@example.com',
        'Marie Dupuis',
        'Marie',
        'Dupuis',
        [],
      ),
      [LocRelator.THESIS_ADVISOR],
    ),
  ],
  [
    new DocumentRecord(
      'rec1',
      'hal-001',
      [],
      [],
      [SourceRecordType.Book],
      new Date('2024-01-01'),
      BibliographicPlatform.HAL,
      [new Literal('Record Title 1', 'en')],
    ),
    new DocumentRecord(
      'rec2',
      'hal-002',
      [],
      [],
      [SourceRecordType.Image],
      new Date('2024-01-01'),
      BibliographicPlatform.OPENALEX,
      [new Literal('Record Title 2', 'fr')],
    ),
  ],
  DocumentState.default,
  new Journal('Nature', 'issnL001', 'The Nature Org', []),
)

const toggle = jest.fn()

describe('MergeDialogDocument component', () => {
  it('renders correctly', () => {
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <MergeDialogDocument
            document={mockDocument}
            checked={true}
            toggleSelection={toggle}
          />
        </I18nProvider>
      </ThemeProvider>,
    )
    const title = screen.getByText('Test Title')
    const info = screen.getByText('01-13-2024')
    const docType = screen.getByText('documents_page_book_icon_label')
    const recordType1 = screen.getByText('sources_page_book_icon_label')
    const recordType2 = screen.getByText('sources_page_image_icon_label')
    const halLogo = screen.getByAltText('HAL')
    const openAlexLogo = screen.getByAltText('OpenAlex')
    const detailLink = screen.getByRole('link')
    const checkbox = screen.getByRole('checkbox')
    expect(title).toBeInTheDocument()
    expect(info).toBeInTheDocument()
    expect(docType).toBeInTheDocument()
    expect(recordType1).toBeInTheDocument()
    expect(recordType2).toBeInTheDocument()
    expect(halLogo).toBeInTheDocument()
    expect(openAlexLogo).toBeInTheDocument()
    expect(detailLink).toHaveAttribute('href', '/en/documents/doc1?tab=sources')
    expect(checkbox).toBeInTheDocument()
    expect(toggle).not.toHaveBeenCalled()
    fireEvent.click(checkbox)
    expect(toggle).toHaveBeenCalledWith('doc1')
  })

  it('handle date and journal displaying', () => {
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <MergeDialogDocument
            document={mockDocumentWithJournal}
            checked={true}
            toggleSelection={toggle}
          />
        </I18nProvider>
      </ThemeProvider>,
    )
    const title = screen.getByText('Test Title 2')
    const info = screen.getByText(/John Doe, Marie Dupuis/)
    const journal = screen.getByText('Nature')
    const detailLink = screen.getByRole('link')
    expect(title).toBeInTheDocument()
    expect(info).toBeInTheDocument()
    expect(info).toHaveTextContent(
      'documents_page_publication_date_column_no_date_available',
    )
    expect(journal).toBeInTheDocument()
    expect(detailLink).toHaveAttribute('href', '/en/documents/doc2?tab=sources')
  })
})
