import React from 'react'
import { usePathname } from 'next/navigation'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SearchInput from './SearchInput'
import { createTheme, ThemeOptions, ThemeProvider } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import { t } from '@lingui/macro'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@lingui/macro', () => {
  return {
    t: (key: string) => key, // Return the key directly for testing
  }
})

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
}))

describe('SearchInput Component', () => {
  const mockFetchPeopleByName = jest.fn()
  const mockFetchResearchStructuresByName = jest.fn()
  ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')

  const mockState = {
    person: {
      fetchPeopleByName: mockFetchPeopleByName,
      loading: false,
      people: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          type: 'people',
          slug: 'person:john-doe',
        },
      ],
      hasMore: true,
      total: 1,
    },
    researchStructure: {
      fetchResearchStructuresByName: mockFetchResearchStructuresByName,
      loading: false,
      researchStructures: [
        {
          id: '2',
          names: [{ value: 'Lab X', language: 'en', slug: 'lab-x' }],
          type: 'researchStructures',
          slug: 'research-structure:lab-x',
        },
      ],
      hasMore: true,
      total: 1,
    },
    user: {
      setPerspective: jest.fn(),
    },
  }

  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
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

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <SearchInput />
      </ThemeProvider>,
    )

  it('renders SearchInput with initial chips and input box', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    renderComponent()

    const searchInput = screen.getByPlaceholderText(
      'sidebar_search_placeholder',
    )
    expect(searchInput).toBeInTheDocument()

    // Simulate a click on the input to trigger the rendering of the <Paper>
    fireEvent.change(searchInput, { target: { value: 'John' } })

    expect(screen.getByText(t`sidebar_search_people`)).toBeInTheDocument()
    expect(
      screen.getByText(t`sidebar_search_research_structures`),
    ).toBeInTheDocument()
  })

  it('fetches people on typing', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    renderComponent()

    const searchInput = screen.getByPlaceholderText(
      t`sidebar_search_placeholder`,
    )
    await waitFor(
      () =>
        expect(mockFetchResearchStructuresByName).toHaveBeenCalledWith({
          searchTerm: '',
          page: 1,
        }),
      { timeout: 4000 }, // Extend timeout to wait for useEffect
    )
    fireEvent.change(searchInput, { target: { value: 'John' } })
    await waitFor(
      () =>
        // has been called twice, once for the initial render and once for the search term
        expect(mockFetchPeopleByName).toHaveBeenCalledWith({
          searchTerm: 'John',
          page: 1,
        }),
      { timeout: 3000 },
    )
  }, 10000)

  it('fetches research structures when scrolled to bottom', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    renderComponent()
    const searchInput = screen.getByPlaceholderText(
      'sidebar_search_placeholder',
    )
    expect(searchInput).toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: 'Lab X' } })

    const researchGroup = screen
      .getByText(`${t`sidebar_search_research_structures`} (1)`)
      .closest('li')

    Object.defineProperty(researchGroup, 'scrollHeight', {
      value: 100,
      writable: true,
    })
    Object.defineProperty(researchGroup, 'clientHeight', {
      value: 0,
      writable: true,
    })
    fireEvent.scroll(researchGroup!, {
      target: { scrollTop: 100 },
    })

    await waitFor(
      () =>
        expect(mockFetchResearchStructuresByName).toHaveBeenCalledWith({
          searchTerm: 'Lab X',
          page: 1,
        }),
      { timeout: 4000 },
    )
  })

  it('toggles chip selection on click', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    renderComponent()
    const searchInput = screen.getByPlaceholderText(
      'sidebar_search_placeholder',
    )
    expect(searchInput).toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: 'John' } })

    const peopleChip = screen.getByText(t`sidebar_search_people`)
    fireEvent.click(peopleChip)

    // Chip should now be unselected
    expect(peopleChip).toHaveClass(
      'MuiChip-label MuiChip-labelMedium css-1dybbl5-MuiChip-label',
    )
  })

  it('renders grouped options correctly', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    renderComponent()
    const searchInput = screen.getByPlaceholderText(
      'sidebar_search_placeholder',
    )
    expect(searchInput).toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: 'John Doe' } })
    // Check for grouped headers
    expect(
      screen.getByText(`${t`sidebar_search_people`} (1)`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`${t`sidebar_search_research_structures`} (1)`),
    ).toBeInTheDocument()

    // Check for options
    expect(screen.getByText('Lab X')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('sets perspective to person on selecting a person menu item', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    renderComponent()
    const searchInput = screen.getByPlaceholderText(
      'sidebar_search_placeholder',
    )
    expect(searchInput).toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: 'John Doe' } })

    const peopleItem = screen.getByText('John Doe')
    fireEvent.click(peopleItem)
    // check if perpective param is set
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining('perspective=person%3Ajohn-doe'),
      { scroll: false },
    )
  })

  it('sets perspective to research structure on selecting a research structure menu item', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/documents')
    renderComponent()
    const searchInput = screen.getByPlaceholderText(
      'sidebar_search_placeholder',
    )
    expect(searchInput).toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: 'Lab X' } })

    const researchStructureItem = screen.getByText('Lab X')
    fireEvent.click(researchStructureItem)
    // check if perpective param is set
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining('perspective=research-structure%3Alab-x'),
      { scroll: false },
    )
  })

  it('disables the autocomplete when path name is /groups', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/fr/my-groups')
    renderComponent()
    const searchInput = screen.getByPlaceholderText(
      'sidebar_search_placeholder',
    )
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toBeDisabled()
  })
})
