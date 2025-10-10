import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import KeywordSearchAutocomplete, {
  SuggestedKeyword,
} from '@/app/[lang]/documents/[uid]/components/Keywords/components/KeywordSearchAutocomplete'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('KeywordSearchAutocomplete Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const queryClient = new QueryClient()

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <KeywordSearchAutocomplete />
      </QueryClientProvider>,
    )

  it("Check that the 'No options' is displayed by default in the drop-down menu", async () => {
    renderComponent()
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    const autocompleteWrapper = autocomplete.parentElement as HTMLElement
    fireEvent.mouseDown(autocompleteWrapper)
    await waitFor(() =>
      expect(screen.getByText('No options')).toBeInTheDocument(),
    )
  })

  it('Check that a keystroke call the fetch', async () => {
    const mockReturn: SuggestedKeyword[] = []
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <QueryClientProvider client={queryClient}>
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
      </QueryClientProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'a' } })
    await waitFor(() => {
      expect(fetchKeywordsMock).toHaveBeenCalledWith('a')
    })
  })

  it('Check that result appear in option menu in right format', async () => {
    const mockReturn: SuggestedKeyword[] = [
      {
        link: 'http://vocab.getty.edu/aat/300046021',
        num: '300046021',
        text: 'diadems',
        vocab: 'AAT',
      },
    ]
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    render(
      <QueryClientProvider client={queryClient}>
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
      </QueryClientProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'd' } })
    await waitFor(async () => {
      expect(fetchKeywordsMock).toHaveBeenCalledWith('d')
      expect(screen.getByText('AAT')).toBeInTheDocument()
      expect(screen.getByText('diadems')).toBeInTheDocument()
      expect(screen.getByText('(300046021)')).toBeInTheDocument()
      const link = await screen.findByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute(
        'href',
        'http://vocab.getty.edu/aat/300046021',
      )
    })
  })

  /*
  it('Check that a keystroke call the refetch after delay', async () => {
    jest.useFakeTimers()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const mockReturn: SuggestedKeyword[] = []
    const fetchKeywordsMock = jest.fn().mockResolvedValue(mockReturn)
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
      </QueryClientProvider>,
    )
    const autocomplete = screen.getByRole('combobox')
    expect(autocomplete).toBeInTheDocument()

    fireEvent.change(autocomplete, { target: { value: 'a' } })
    rerender(
      <QueryClientProvider client={queryClient}>
        <KeywordSearchAutocomplete fetchKeywords={fetchKeywordsMock} />
      </QueryClientProvider>,
    )

    expect(fetchKeywordsMock).not.toHaveBeenCalled()

    await act(async () => {
      jest.runOnlyPendingTimers()
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(fetchKeywordsMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(autocomplete, { target: { value: 'ab' } })

    expect(fetchKeywordsMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.runOnlyPendingTimers()
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(fetchKeywordsMock).toHaveBeenCalledTimes(2)
    })

    //check that the query has been invalidated
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['keywords'] }),
    )
  })*/
})
