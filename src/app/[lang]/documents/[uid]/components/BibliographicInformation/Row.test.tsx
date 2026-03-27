import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'

import DateProvider from '@/components/DateProvider'
import useStore from '@/stores/global_store'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { DocumentField, DocumentFieldKey } from './BibliographicInformation'
import Row from './Row'
import Titles from './Titles'
import { OAStatus } from '@prisma/client'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { Contribution } from '@/types/Contribution'
import { InternalPerson } from '@/types/InternalPerson'
import { LocRelator } from '@/types/LocRelator'
import { useSession } from 'next-auth/react'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: jest.fn(),
}))

const authz = makeAuthzContext({
  roleAssignments: [
    makeAssignment(
      'document_editor',
      [
        {
          action: PermissionAction.update,
          subject: PermissionSubject.Document,
          fields: [
            'titles',
            'abstracts',
            'contributors',
            'identifiers',
            'documentType',
          ],
        },
      ],
      [{ entityType: 'Person', entityUid: 'local-me' }],
    ),
  ],
})

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  OAStatus.GREEN,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  OAStatus.DIAMOND,
  [
    new Literal('Sample Document Title', 'en'),
    new Literal('Exemple de titre de document', 'fr'),
  ],
  [],
  [],
  [
    new Contribution(
      new InternalPerson('local-me', null, 'local-me', 'First', 'Last', []),
      [LocRelator.AUTHOR],
    ),
  ],
)

describe('Row Component', () => {
  const mockState = {
    document: {
      selectedDocument: document,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { authz: authz } },
    })
  })

  const theme = createTheme({
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
  })

  i18n.activate('en')

  const titleField: DocumentField = {
    value: 'titles' as DocumentFieldKey,
    title: i18n.t('document_details_page_titles_row_label'),
    noContentAvailableMessage: i18n.t(
      'document_details_page_no_title_available',
    ),
    component: (props) => (
      <Titles
        {...props}
        content={props.content}
        field={props.field!}
        edit={props.edit!}
        setEdit={props.setEdit!}
        setAlert={() => {}}
      />
    ),
    hasLanguageSelector: true,
  }

  const renderTitleComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <DateProvider>
            <Row field={titleField} />
          </DateProvider>
        </I18nProvider>
      </ThemeProvider>,
    )

  const typeField: DocumentField = {
    value: 'type' as DocumentFieldKey,
    title: i18n.t('document_details_page_type_row_label'),
    noContentAvailableMessage: i18n.t(
      'document_details_page_no_title_available',
    ),
    component: (props) => (
      <Titles
        {...props}
        content={props.content}
        field={props.field!}
        edit={props.edit!}
        setEdit={props.setEdit!}
        setAlert={() => {}}
      />
    ),
    hasLanguageSelector: true,
  }

  const renderTypeComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <DateProvider>
            <Row field={typeField} />
          </DateProvider>
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders the title component with its label and value', async () => {
    renderTitleComponent()

    expect(
      screen.getByText(i18n.t('document_details_page_titles_row_label')),
    ).toBeInTheDocument()
    expect(screen.getByText('Sample Document Title')).toBeInTheDocument()
  })

  it('updates title when language is changed', () => {
    renderTitleComponent()

    expect(screen.getByText('Sample Document Title')).toBeInTheDocument()

    fireEvent.click(screen.getByText('fr'))

    expect(screen.getByText('Exemple de titre de document')).toBeInTheDocument()
  })

  it('displays fallback text when no title is available', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ document: { selectedDocument: { titles: [] } } }),
    )

    renderTitleComponent()

    expect(
      screen.getByText(i18n.t('document_details_page_no_title_available')),
    ).toBeInTheDocument()
  })

  it('displays the french title if no english title is available', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        document: {
          selectedDocument: {
            titles: [
              new Literal('Título de ejemplo', 'es'),
              new Literal('Exemple de titre', 'fr'),
            ],
          },
        },
      }),
    )

    renderTitleComponent()

    expect(screen.getByText('Exemple de titre')).toBeInTheDocument()
    expect(screen.getByText('fr')).toBeInTheDocument()
    expect(screen.getByText('es')).toBeInTheDocument()
    expect(screen.getByText('fr').parentElement).toHaveClass(
      'MuiChip-colorPrimary',
    )
    expect(screen.getByText('es').parentElement).toHaveClass(
      'MuiChip-colorDefault',
    )
  })

  it('displays the english title if no undetermined title is available', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        document: {
          selectedDocument: {
            titles: [
              new Literal('Sample Document Title', 'en'),
              new Literal('abcdefg', 'ul'),
            ],
          },
        },
      }),
    )

    renderTitleComponent()

    expect(screen.getByText('Sample Document Title')).toBeInTheDocument()
    expect(screen.getByText('n/a')).toBeInTheDocument()
    expect(screen.getByText('en')).toBeInTheDocument()
    expect(screen.getByText('en').parentElement).toHaveClass(
      'MuiChip-colorPrimary',
    )
    expect(screen.getByText('n/a').parentElement).toHaveClass(
      'MuiChip-colorDefault',
    )
  })

  it('displays the undetermined title if no other title is available', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        document: {
          selectedDocument: {
            titles: [new Literal('abcdefg', 'ul')],
          },
        },
      }),
    )

    renderTitleComponent()

    expect(screen.getByText('abcdefg')).toBeInTheDocument()
    expect(screen.queryByText('n/a')).toBeNull()
  })

  it('does not display the language selector if the document field is not localized', () => {
    renderTypeComponent()

    expect(screen.queryByText('fr')).toBeNull()
    expect(screen.queryByText('en')).toBeNull()
  })
})
