import useStore from '@/stores/global_store'
import { render, screen, act } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { HalSubmitType as DbHalSubmitType, OAStatus } from '@prisma/client'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { DocumentRecord } from '@/types/DocumentRecord'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import HalStatusCell from './HalStatusCell'
import HalStatusCellBadge, {
  HalStatusCellType,
} from '@/app/[lang]/documents/components/HalStatusCellBadge'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('./HalStatusCellBadge', () => {
  const actual = jest.requireActual('./HalStatusCellBadge')
  return {
    __esModule: true,
    ...actual,
    default: jest.fn(actual.default),
  }
})

const mockedHalStatusCellBadge = HalStatusCellBadge as jest.Mock

const mockState = {
  user: {
    currentPerspective: {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      type: 'person',
      slug: 'person:john-doe',
      memberships: [
        {
          id: 1,
          personId: 1,
          researchStructureId: 1,
          startDate: null,
          endDate: null,
          positionCode: null,
          researchStructure: {
            id: 1,
            uid: '12345',
            acronym: 'ABC',
            external: false,
            slug: 'research-structure:abc',
          },
        },
        {
          id: 2,
          personId: 1,
          researchStructureId: 2,
          startDate: null,
          endDate: null,
          positionCode: null,
          researchStructure: {
            id: 2,
            uid: '67890',
            acronym: 'DEF',
            external: false,
            slug: 'research-structure:def',
          },
        },
      ],
      membershipAcronyms: ['ABC', 'DEF'],
      hasIdHAL: () => true,
    },
  },
}

const createDocument = (
  hasHalRecord: boolean,
  halCollectionCodes: string[] = [],
  halSubmitType: DbHalSubmitType | null = null,
) =>
  new Document(
    'doc1',
    DocumentType.JournalArticle,
    OAStatus.CLOSED,
    '2024-01-01',
    new Date('2024-01-01'),
    new Date('2024-01-01'),
    OAStatus.CLOSED,
    [new Literal('Test Title', 'en')],
    [new Literal('Test Abstract', 'en')],
    [],
    [],
    [
      ...(hasHalRecord
        ? [
            new DocumentRecord(
              'rec1',
              'hal-001',
              [],
              [],
              [],
              new Date('2024-01-01'),
              BibliographicPlatform.HAL,
              [new Literal('Record Title 1', 'en')],
              'https://url-to-record-1',
              halCollectionCodes,
              halSubmitType,
              undefined,
            ),
          ]
        : []),
      new DocumentRecord(
        'rec2',
        'hal-002',
        [],
        [],
        [],
        new Date('2024-01-01'),
        BibliographicPlatform.OPENALEX,
        [new Literal('Record Title 2', 'fr')],
        'https://url-to-record-2',
        undefined,
      ),
    ],
  )

beforeEach(() => {
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector(mockState),
  )

  act(() => {
    i18n.activate('en')
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('HalStatusCell Component', () => {
  it('displays the outside Hal status when currentPerspective is person with IdHal', async () => {
    const document = createDocument(false)

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_outside_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.OutsideHal,
        documentUid: 'doc1',
      }),
      {},
    )
  })

  it('displays the outside Hal missing id status when currentPerspective is person without IdHal', async () => {
    const document = createDocument(false)
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        ...mockState,
        user: {
          ...mockState.user,
          currentPerspective: {
            ...mockState.user.currentPerspective,
            hasIdHAL: () => false,
          },
        },
      }),
    )

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_outside_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.OutsideHalMissingId,
      }),
      {},
    )
  })

  it('displays the outside Hal status when currentPerspective is research structure with IdHal', async () => {
    const document = createDocument(false)
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        ...mockState,
        user: {
          ...mockState.user,
          currentPerspective: {
            id: '1',
            uid: '12345',
            acronym: 'ABC',
            external: false,
            slug: 'research-structure:abc',
            type: 'research_structure',
            names: [],
            hasIdHAL: () => true,
          },
        },
      }),
    )

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_outside_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.OutsideHal,
        documentUid: 'doc1',
      }),
      {},
    )
  })

  it('displays the outside Hal missing id status when currentPerspective is research structure without IdHal', async () => {
    const document = createDocument(false)
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        ...mockState,
        user: {
          ...mockState.user,
          currentPerspective: {
            id: '1',
            uid: '12345',
            acronym: 'ABC',
            external: false,
            slug: 'research-structure:abc',
            type: 'research_structure',
            names: [],
            hasIdHAL: () => false,
          },
        },
      }),
    )

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_outside_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.OutsideHalMissingId,
      }),
      {},
    )
  })

  it('displays the outside Hal status when currentPerspective is not a research structure or person', async () => {
    const document = createDocument(false)
    jest.mock('@/types/Person', () => {
      const actual = jest.requireActual('@/types/Person')
      return {
        __esModule: true,
        ...actual,
        isPerson: () => false,
      }
    })
    jest.mock('@/types/ResearchStructure', () => {
      const actual = jest.requireActual('@/types/ResearchStructure')
      return {
        __esModule: true,
        ...actual,
        isResearchStructure: () => false,
      }
    })

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_outside_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.OutsideHal,
        documentUid: 'doc1',
      }),
      {},
    )
  })

  it("displays the in collection status when hal record in collection and document hasn't been updated", async () => {
    jest.spyOn(Document.prototype, 'hasBeenUpdated').mockReturnValue(false)
    const document = createDocument(
      true,
      [
        mockState.user.currentPerspective.memberships[0].researchStructure
          .acronym,
      ],
      'file',
    )

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_in_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.InCollection,
        halSubmitType: 'file',
        halUrl: 'https://url-to-record-1/',
      }),
      {},
    )
  })

  it("displays the not in sync with collection status if hal record isn't in collection", async () => {
    const document = createDocument(true, ['SOME_OTHER_CODE'], 'file')

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_in_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.NotInSyncWithCollection,
        acronyms: ['ABC', 'DEF'],
        documentUid: 'doc1',
        halUrl: 'https://url-to-record-1/',
        isOutOfCollection: true,
        hasBeenUpdated: false,
        halSubmitType: 'file',
      }),
      {},
    )
  })

  it('displays the not in sync with collection status if document has been updated', async () => {
    jest.spyOn(Document.prototype, 'hasBeenUpdated').mockReturnValue(true)
    const document = createDocument(
      true,
      [
        mockState.user.currentPerspective.memberships[0].researchStructure
          .acronym,
      ],
      'file',
    )

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_in_hal')),
    ).toBeInTheDocument()
    expect(mockedHalStatusCellBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        type: HalStatusCellType.NotInSyncWithCollection,
        acronyms: ['ABC', 'DEF'],
        documentUid: 'doc1',
        halUrl: 'https://url-to-record-1/',
        isOutOfCollection: false,
        hasBeenUpdated: true,
        halSubmitType: 'file',
      }),
      {},
    )
  })

  it('displays the alternate icon', async () => {
    const document = createDocument(
      true,
      [
        mockState.user.currentPerspective.memberships[0].researchStructure
          .acronym,
      ],
      'notice',
    )

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('AttachFileOffIcon')).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_in_hal')),
    ).toBeInTheDocument()
  })
})
