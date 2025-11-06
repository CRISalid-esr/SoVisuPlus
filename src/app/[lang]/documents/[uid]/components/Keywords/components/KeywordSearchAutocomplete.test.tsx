import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import KeywordSearchAutocomplete, {
  SuggestedKeywordsData,
} from '@/app/[lang]/documents/[uid]/components/Keywords/components/KeywordSearchAutocomplete'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { Concept } from '@/types/Concept'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { LocRelator } from '@/types/LocRelator'
import useStore from '@/stores/global_store'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { InternalPerson } from '@/types/InternalPerson'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'

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
            'subjects',
          ],
        },
      ],
      [{ entityType: 'Person', entityUid: 'local-me' }],
    ),
  ],
})

describe('KeywordSearchAutocomplete Component', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { authz: authz } },
    })
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
    expect(() => abilityFromAuthzContext(authz)).not.toThrow()
    jest.clearAllMocks()
  })

  const document: Document = new Document(
    'doc-123',
    DocumentType.Document,
    '2022',
    new Date('2022-01-01T00:00:00.000Z'),
    new Date('2022-12-31T23:59:59.000Z'),
    [
      new Literal('Sample Document Title', 'en'),
      new Literal('Sample Abstract', 'fr'),
    ],
    [new Literal('Sample Abstract', 'fr')],
    [], // empty subjects
    [
      new Contribution(
        new InternalPerson('local-me', null, 'local-me', 'First', 'Last', []),
        [LocRelator.AUTHOR],
      ),
    ],
  )

  const mockState = {
    document: {
      fetchDocumentById: jest.fn(),
      loading: false,
      selectedDocument: document,
      addConcepts: jest.fn(),
    },
    user: {
      currentPerspective: {
        person: {
          id: '1',
          firstName: 'First',
          lastName: 'Last',
          type: 'people',
          slug: 'person:local-me',
        },
      },
      connectedUser: {
        person: {
          id: '1',
          firstName: 'First',
          lastName: 'Last',
          type: 'people',
          slug: 'person:local-me',
        },
      },
    },
  }

  const renderComponent = () =>
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete authorization={true} selectedVocabs={['vocab-test']}/>
      </I18nProvider>,
    )

  it("Check that the 'Please enter at least 3 characters' is displayed by default in the drop-down menu", async () => {
    renderComponent()
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    const autocompleteWrapper = autocomplete.parentElement as HTMLElement
    fireEvent.mouseDown(autocompleteWrapper)
    await waitFor(() =>
      expect(
        screen.getByText(
          i18n.t('document_details_page_keywords_input_default'),
        ),
      ).toBeInTheDocument(),
    )
  })

  it("Check that the 'No options' message is displayed when fetch return no data", async () => {
    const mockReturn: SuggestedKeywordsData[] = []
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete
          fetchKeywords={fetchKeywordsMock}
          selectedVocabs={['vocab-test']}
          authorization={true}
        />
      </I18nProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'abc' } })
    await waitFor(() =>
      expect(
        screen.getByText(
          i18n.t('document_details_page_keywords_input_options_no_options'),
        ),
      ).toBeInTheDocument(),
    )
  })

  it("Check that a keystroke doesn't call the fetch until there is three letters", async () => {
    const mockReturn: SuggestedKeywordsData[] = []
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete
          fetchKeywords={fetchKeywordsMock}
          selectedVocabs={['vocab-test']}
          authorization={true}
        />
      </I18nProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'a' } })
    await waitFor(() => {
      expect(fetchKeywordsMock).not.toHaveBeenCalled()
    })

    fireEvent.change(autocomplete, { target: { value: 'ab' } })
    await waitFor(() => {
      expect(fetchKeywordsMock).not.toHaveBeenCalled()
    })

    fireEvent.change(autocomplete, { target: { value: 'abc' } })
    await waitFor(() => {
      expect(fetchKeywordsMock).toHaveBeenCalledWith('abc', ['vocab-test'])
    })
  })

  it('Check that result appear in option menu in right format', async () => {
    const mockReturn: SuggestedKeywordsData[] = [
      {
        items: [
          {
            concept: Concept.fromObject({
              uid: 'http://vocab.getty.edu/aat/300046021',
              uri: 'http://vocab.getty.edu/aat/300046021',
              prefLabels: [],
              altLabels: [],
            }),
            num: '300046021',
            text: 'diadems',
            vocab: 'AAT',
            highlight: '<em> diadems </em>',
          },
        ],
        total: 1,
        vocab: 'AAT',
      },
    ]
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete
          fetchKeywords={fetchKeywordsMock}
          selectedVocabs={['vocab-test']}
          authorization={true}
        />
      </I18nProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'dia' } })
    await waitFor(async () => {
      expect(fetchKeywordsMock).toHaveBeenCalledWith('dia', ['vocab-test'])
      expect(
        screen.getByText('AAT - Art & Architecture Thesaurus'),
      ).toBeInTheDocument()
      const emElement = screen.getByText('diadems')
      expect(emElement).toBeInTheDocument()
      expect(emElement.tagName).toBe('EM')
      expect(screen.getByText('(300046021)')).toBeInTheDocument()
      const link = await screen.findByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute(
        'href',
        'http://vocab.getty.edu/aat/300046021',
      )
    })
  })

  it('Check that a keystroke call the refetch after delay', async () => {
    jest.useFakeTimers()
    const mockReturn: SuggestedKeywordsData[] = []
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete
          fetchKeywords={fetchKeywordsMock}
          selectedVocabs={['vocab-test']}
          authorization={true}
        />
      </I18nProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'a' } })
    expect(fetchKeywordsMock).not.toHaveBeenCalled()

    fireEvent.change(autocomplete, { target: { value: 'abc' } })

    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(fetchKeywordsMock).not.toHaveBeenCalled()

    await act(async () => {
      jest.runOnlyPendingTimers()
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(fetchKeywordsMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(autocomplete, { target: { value: 'abcd' } })

    expect(fetchKeywordsMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    fireEvent.change(autocomplete, { target: { value: 'abcde' } })

    expect(fetchKeywordsMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(600)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(fetchKeywordsMock).toHaveBeenCalledTimes(2)
    })
  })

  it('Check that the adding button behave as expected', async () => {
    const mockReturn: SuggestedKeywordsData[] = [
      {
        items: [
          {
            concept: Concept.fromObject({
              uid: 'http://vocab.getty.edu/aat/300046021',
              uri: 'http://vocab.getty.edu/aat/300046021',
              prefLabels: [],
              altLabels: [],
            }),
            num: '300046021',
            text: 'abcd',
            vocab: 'AAT',
            highlight: '<em> diadems </em>',
          },
        ],
        total: 1,
        vocab: 'AAT',
      },
    ]
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete
          fetchKeywords={fetchKeywordsMock}
          selectedVocabs={['vocab-test']}
          authorization={true}
        />
      </I18nProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    const addingButton = screen.getByRole('button', { name: /adding_button/i })
    expect(autocomplete).toBeInTheDocument()
    expect(addingButton).toBeInTheDocument()
    expect(addingButton).toBeDisabled()

    fireEvent.change(autocomplete, { target: { value: 'a' } })
    expect(addingButton).toBeDisabled()

    fireEvent.change(autocomplete, { target: { value: 'abc' } })
    expect(addingButton).toBeDisabled()

    const listbox = await screen.findByRole('listbox')
    const options = within(listbox).getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)
    fireEvent.click(options[0])

    expect(addingButton).toBeEnabled()
    fireEvent.click(addingButton)
    await waitFor(() => {
      expect(
        screen.getByText(i18n.t('keywords_concept_added_success')),
      ).toBeInTheDocument()
    })
  })

  it("Check that unauthorized user can't see the autocomplete field", async () => {
    const mockReturn: SuggestedKeywordsData[] = []
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete
          fetchKeywords={fetchKeywordsMock}
          authorization={false}
        />
      </I18nProvider>,
    )

    const comboBox = screen.queryByRole('combobox')
    expect(comboBox).not.toBeInTheDocument()
  })
})

//add test about selectedVocab length
