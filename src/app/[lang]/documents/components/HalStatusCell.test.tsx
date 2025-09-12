import useStore from '@/stores/global_store'
import { render, screen, act } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { HalSubmitType as DbHalSubmitType } from '@prisma/client'

import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { DocumentRecord } from '@/types/DocumentRecord'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import HalStatusCell from './HalStatusCell'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

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
    '2024-01-01',
    new Date('2024-01-01'),
    new Date('2024-01-01'),
    [new Literal('Test Title', 'en')],
    [new Literal('Test Abstract', 'en')],
    [],
    [],
    [
      ...(hasHalRecord
        ? [
            new DocumentRecord(
              'rec1',
              BibliographicPlatform.HAL,
              [new Literal('Record Title 1', 'en')],
              'https://url-to-record-1',
              halCollectionCodes,
              halSubmitType,
            ),
          ]
        : []),
      new DocumentRecord(
        'rec2',
        BibliographicPlatform.OPENALEX,
        [new Literal('Record Title 2', 'fr')],
        'https://url-to-record-2',
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

describe('HalStatusCell Component', () => {
  it('displays the in collection status', async () => {
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
      screen.getByText(i18n.t('documents_page_hal_status_in_collection')),
    ).toBeInTheDocument()
  })

  it('displays the out of collection status', async () => {
    act(() => {
      i18n.activate('en')
    })

    const document = createDocument(true, ['SOME_OTHER_CODE'], 'file')

    render(
      <I18nProvider i18n={i18n}>
        <HalStatusCell row={{ original: document }} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('documents_page_hal_status_out_of_collection'), {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        mockState.user.currentPerspective.membershipAcronyms.join(', '),
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument()
  })

  it('displays the outside Hal status', async () => {
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
      screen.getByText(i18n.t('documents_page_hal_status_in_collection')),
    ).toBeInTheDocument()
  })
})
