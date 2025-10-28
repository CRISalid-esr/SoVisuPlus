import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import KeywordSearchAutocomplete, {
  SuggestedKeyword,
  SuggestedKeywordsData,
} from '@/app/[lang]/documents/[uid]/components/Keywords/components/KeywordSearchAutocomplete'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'

describe('KeywordSearchAutocomplete Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderComponent = () =>
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete />
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
    const mockReturn: SuggestedKeyword[] = []
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <I18nProvider i18n={i18n}>
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
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
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
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
      expect(fetchKeywordsMock).toHaveBeenCalledWith('abc')
    })
  })

  it('Check that result appear in option menu in right format', async () => {
    const mockReturn: SuggestedKeywordsData[] = [
      {
        items: [
          {
            link: 'http://vocab.getty.edu/aat/300046021',
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
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
      </I18nProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'dia' } })
    await waitFor(async () => {
      expect(fetchKeywordsMock).toHaveBeenCalledWith('dia')
      expect(screen.getByText('AAT')).toBeInTheDocument()
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
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
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
})
