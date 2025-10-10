//lorsque les données sont chargées, je m'attends à ce que les options appraissent dans le menu déroulant
//lorsqu'il y a une erreur, je m'attends à ce que l'affichage se mette à jour
//lorsqu'une lettre est tapée et après un délai résonable, je m'attends à ce que le fetch est été lancé

import {
  //act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import KeywordSearchAutocomplete from //SuggestedKeyword,
'@/app/[lang]/documents/[uid]/components/Keywords/components/KeywordSearchAutocomplete'
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

  /*it('Check that a keystroke call the fetch', async () => {
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
      expect(fetchKeywordsMock).toHaveBeenCalled()
    })
  })

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
