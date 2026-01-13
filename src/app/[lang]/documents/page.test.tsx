import DateProvider from '@/components/DateProvider'
import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { Journal } from '@/types/Journal'
import { JournalIdentifier } from '@/types/JournalIdentifier'
import DocumentsPage from './page'
import { Literal } from '@/types/Literal'
import { InternalPerson } from '@/types/InternalPerson'
import { DocumentRecord } from '@/types/DocumentRecord'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { Contribution } from '@/types/Contribution'
import { LocRelator } from '@/types/LocRelator'
import { SessionProvider } from 'next-auth/react'
import { makeMockSession } from '@/app/auth/makeMockSession'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { OAStatus } from '@prisma/client'

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
const mockCountDocuments = jest.fn()
const mockFetchDocumentById = jest.fn()
const mockState = {
  document: {
    fetchDocuments: mockFetchDocuments,
    countDocuments: mockCountDocuments,
    fetchDocumentById: mockFetchDocumentById,
    loading: false,
    documents: [
      new Document(
        'doc1',
        DocumentType.JournalArticle,
        OAStatus.GREEN,
        '2024-01-01',
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        OAStatus.DIAMOND,
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
            [],
            [],
            new Date('2024-01-01'),
            BibliographicPlatform.HAL,
            [new Literal('Record Title 1', 'en')],
            'https://url-to-record-1',
            [],
            null,
            undefined,
          ),
          new DocumentRecord(
            'rec2',
            [],
            [],
            new Date('2024-01-01'),
            BibliographicPlatform.OPENALEX,
            [new Literal('Record Title 2', 'fr')],
            'https://url-to-record-2',
            [],
            null,
            undefined,
          ),
        ],
        DocumentState.default,
        new Journal('Test journal', '0123-4567', 'Test publisher', [
          new JournalIdentifier('issn', '0123-4567', 'Online'),
        ]),
      ),
    ],
    totalItems: 1,
    count: {
      allItems: 0,
      incompleteHalRepositoryItems: 0,
    },
  },
  user: {
    currentPerspective: {
      type: 'person',
      getDisplayName: () => 'John Doe',
      memberships: [],
      membershipAcronyms: ['ABC', 'DEF'],
    },
    ownPerspective: true,
  },
  harvesting: {
    harvestings: [],
    initializeHarvesting: jest.fn(),
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

  mockCountDocuments.mockResolvedValue({
    allItems: 0,
    incompleteHalRepositoryItems: 0,
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

// The logged-in user has the "document_merger" role scoped to Person:person-1
const authz = makeAuthzContext({
  roleAssignments: [
    makeAssignment(
      'document_merger',
      [{ action: PermissionAction.merge, subject: PermissionSubject.Document }],
      [{ entityType: 'Person', entityUid: 'person-1' }],
    ),
  ],
})

const session = makeMockSession(authz)

const renderComponent = () =>
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <DateProvider>
          <SessionProvider session={session}>
            <DocumentsPage />
          </SessionProvider>
        </DateProvider>
      </I18nProvider>
    </ThemeProvider>,
  )

beforeEach(() => {
  act(() => {
    i18n.activate('en')
  })
})

describe('DocumentsPage Component', () => {
  it('renders DocumentsPage correctly', async () => {
    renderComponent()

    expect(
      screen.getByText((content) =>
        content.startsWith(i18n.t('documents_page_main_title_first_person')),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_synchronize_button')),
    ).toBeInTheDocument()
  })

  describe('DocumentsPage Component', () => {
    it('renders first-person title when ownPerspective is true', () => {
      ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({
          ...mockState,
          user: {
            ...mockState.user,
            ownPerspective: true,
          },
        }),
      )

      renderComponent()
      expect(
        screen.getByText((content) =>
          content.startsWith(i18n.t('documents_page_main_title_first_person')),
        ),
      ).toBeInTheDocument()
    })

    it('renders third-person title when ownPerspective is false', () => {
      ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
        selector({
          ...mockState,
          user: {
            ...mockState.user,
            ownPerspective: false,
          },
        }),
      )

      renderComponent()
      expect(
        screen.getByText((content) =>
          content.startsWith(i18n.t('documents_page_main_title')),
        ),
      ).toBeInTheDocument()
    })
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
        halCollectionCodes: JSON.stringify(['ABC', 'DEF']),
        areHalCollectionCodesOmitted: false,
      })
    })
  })

  it('fetches incomplete HAL repository document count on mount', async () => {
    renderComponent()

    await waitFor(() => {
      expect(mockCountDocuments).toHaveBeenCalledWith({
        page: 1,
        searchTerm: '',
        columnFilters: JSON.stringify([]),
        searchLang: 'en',
        contributorType: 'person',
        contributorUid: '',
        requestId: 1,
        halCollectionCodes: JSON.stringify(['ABC', 'DEF']),
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
      expect(screen.getByText('Test journal')).toBeInTheDocument()
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

  it('enables the "Merge selected publications" button only when 2 or more rows are selected', async () => {
    const doc1 = mockState.document.documents[0]
    // person-1 is a contributor to doc1 and doc2 else
    // the user would not have the "document_merger" permission on doc2
    const doc2 = new Document(
      'doc2',
      DocumentType.JournalArticle,
      OAStatus.GREEN,
      '2023-12-31',
      new Date('2023-12-31'),
      new Date('2023-12-31'),
      OAStatus.DIAMOND,
      [new Literal('Another Title', 'en')],
      [],
      [],
      [
        new Contribution(
          new InternalPerson('person-1', null, 'John Doe', 'John', 'Doe', []),
          [LocRelator.AUTHOR],
        ),
      ],
      [],
    )

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        ...mockState,
        document: {
          ...mockState.document,
          documents: [doc1, doc2],
          totalItems: 2,
        },
      }),
    )

    renderComponent()

    await screen.findByText('Test Title')
    await screen.findByText('Another Title')

    let mergeBtn = screen.queryByRole('button', {
      name: i18n.t('documents_page_merge_selected_documents_button'),
    })
    // default : button is present but not enabled
    expect(mergeBtn).toBeInTheDocument()
    expect(mergeBtn).toBeDisabled()

    const checkboxes = screen.getAllByRole('checkbox')

    // Select first row -> button still disabled
    fireEvent.click(checkboxes[1])
    await waitFor(() => {
      mergeBtn = screen.getByRole('button', {
        name: i18n.t('documents_page_merge_selected_documents_button'),
      })
      expect(mergeBtn).toBeDisabled()
    })

    // Select second row -> button enabled
    fireEvent.click(checkboxes[2])
    await waitFor(() => {
      mergeBtn = screen.getByRole('button', {
        name: i18n.t('documents_page_merge_selected_documents_button'),
      })
      expect(mergeBtn).toBeEnabled()
    })
  })

  it('calls mergeDocuments, then re-fetches the list', async () => {
    const mockMergeDocuments = jest.fn().mockResolvedValue({
      updated: [
        { uid: 'doc1', state: 'waiting_for_update' },
        { uid: 'doc2', state: 'waiting_for_update' },
      ],
    })

    const doc1 = mockState.document.documents[0]
    const doc2 = new Document(
      'doc2',
      DocumentType.JournalArticle,
      OAStatus.GREEN,
      '2023-12-31',
      new Date('2023-12-31'),
      new Date('2023-12-31'),
      OAStatus.DIAMOND,
      [new Literal('Another Title', 'en')],
      [],
      [],
      [
        new Contribution(
          new InternalPerson('person-1', null, 'John Doe', 'John', 'Doe', []),
          [LocRelator.AUTHOR],
        ),
      ],
      [],
    )

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        ...mockState,
        document: {
          ...mockState.document,
          documents: [doc1, doc2],
          totalItems: 2,
          mergeDocuments: mockMergeDocuments,
        },
      }),
    )

    renderComponent()

    await screen.findByText('Test Title')
    await screen.findByText('Another Title')

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    fireEvent.click(checkboxes[2])

    const mergeBtn = screen.getByRole('button', {
      name: i18n.t('documents_page_merge_selected_documents_button'),
    })

    fireEvent.click(mergeBtn)

    await waitFor(() => {
      expect(mockMergeDocuments).toHaveBeenCalledTimes(1)
      // order should follow the current table order (date desc): doc1 then doc2
      expect(mockMergeDocuments).toHaveBeenCalledWith(['doc1', 'doc2'])
    })
    await waitFor(() => {
      expect(mockFetchDocuments).toHaveBeenCalledTimes(2)
    })
  })
})
