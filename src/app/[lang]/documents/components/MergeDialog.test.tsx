import MergeDialog from '@/app/[lang]/documents/components/MergeDialog'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { I18nProvider } from '@lingui/react'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { OAStatus, SourceRecordType } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { DocumentRecord } from '@/types/DocumentRecord'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { Contribution } from '@/types/Contribution'
import { Person } from '@/types/Person'
import { LocRelator } from '@/types/LocRelator'
import { Journal } from '@/types/Journal'
import useStore from '@/stores/global_store'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams('')),
}))

const theme = createTheme({
  typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
  palette: { primary: { main: '#1976d2' } },
  utils: { pxToRem: (value: number) => `${value / 16}rem` },
})
const open = jest.fn()
const merge = jest.fn()

const mockDocs = [
  new Document(
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
  ),
  new Document(
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
  ),
]

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockState = {
  document: {
    documents: mockDocs,
  },
}

describe('MergeDialog', () => {
  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )

    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <MergeDialog
            open={true}
            setOpen={open}
            onMerge={merge}
            initialSelectedDocuments={['doc1', 'doc2']}
          />
        </I18nProvider>
      </ThemeProvider>,
    )

    const closeButton = screen.getByTestId('CloseIcon')
    const cancelButton = screen.getByText(
      'documents_merge_dialog_box_cancel_button',
    )
    const mergeButton = screen.getByText(
      'documents_merge_dialog_box_merge_button',
    )
    const [checkAll, checkDoc1, checkDoc2] = screen.getAllByRole('checkbox')

    expect(
      screen.getByText('documents_merge_dialog_box_title'),
    ).toBeInTheDocument()
    expect(closeButton).toBeInTheDocument()
    expect(
      screen.getByText('documents_merge_dialog_box_info_alert'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('documents_merge_dialog_box_check_all_label'),
    ).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Title 2')).toBeInTheDocument()
    expect(cancelButton).toBeInTheDocument()
    expect(mergeButton).toBeInTheDocument()
    expect(checkAll).toBeChecked()
    expect(checkDoc1).toBeChecked()
    expect(checkDoc2).toBeChecked()
    expect(open).not.toHaveBeenCalled()
    fireEvent.click(closeButton)
    expect(open).toHaveBeenCalledWith(false)
    expect(merge).not.toHaveBeenCalled()
    fireEvent.click(mergeButton)
    expect(merge).toHaveBeenCalledWith(['doc1', 'doc2'])
  })

  it('check selection behavior', () => {
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <MergeDialog
            open={true}
            setOpen={open}
            onMerge={merge}
            initialSelectedDocuments={['doc1', 'doc2']}
          />
        </I18nProvider>
      </ThemeProvider>,
    )

    const mergeButton = screen.getByText(
      'documents_merge_dialog_box_merge_button',
    )
    const [checkAll, checkDoc1, checkDoc2] = screen.getAllByRole('checkbox')

    //default : all is checked
    expect(checkAll).toBeChecked()
    expect(checkDoc1).toBeChecked()
    expect(checkDoc2).toBeChecked()

    //deselect the check all checkbox doesn't change checked value for docs
    fireEvent.click(checkAll)
    expect(checkAll).not.toBeChecked()
    expect(checkDoc1).toBeChecked()
    expect(checkDoc2).toBeChecked()

    //deselect one doc and click on merge button
    fireEvent.click(checkDoc1)
    expect(checkDoc1).not.toBeChecked()
    expect(merge).not.toHaveBeenCalled()
    fireEvent.click(mergeButton)
    expect(merge).toHaveBeenCalledWith(['doc2'])

    //checking lasting unchecked doc involve to set check all checkbox to true
    fireEvent.click(checkDoc1)
    expect(checkAll).toBeChecked()
    expect(checkDoc1).toBeChecked()

    //deselect one doc involve to set check all checkbox to false
    fireEvent.click(checkDoc1)
    expect(checkAll).not.toBeChecked()
    expect(checkDoc1).not.toBeChecked()

    //check all comes back to initial state
    fireEvent.click(checkAll)
    expect(checkAll).toBeChecked()
    expect(checkDoc1).toBeChecked()
    expect(checkDoc2).toBeChecked()
    expect(merge).toHaveBeenCalledTimes(1)
    fireEvent.click(mergeButton)
    expect(merge).toHaveBeenCalledTimes(2)
    expect(merge).toHaveBeenNthCalledWith(2, ['doc1', 'doc2'])
  })
})
