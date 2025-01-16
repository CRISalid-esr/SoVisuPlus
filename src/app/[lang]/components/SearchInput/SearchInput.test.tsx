import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SearchInput from './SearchInput'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import { t } from '@lingui/macro'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@lingui/macro', () => {
  return {
    t: (key: string) => key, // Return the key directly for testing
  }
})

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))
const mockUsePathname = require('next/navigation').usePathname

describe('SearchInput Component', () => {
  const mockFetchPeople = jest.fn()
  const mockFetchResearchStructures = jest.fn()

  const mockState = {
    person: {
      fetchPeople: mockFetchPeople,
      loading: false,
      people: [{ id: '1', firstName: 'John', lastName: 'Doe', type: 'people' }],
      hasMore: true,
      total: 1,
    },
    researchStructure: {
      fetchResearchStructures: mockFetchResearchStructures,
      loading: false,
      researchStructures: [
        { id: '2', names: { en: 'Lab X' }, type: 'researchStructures' },
      ],
      hasMore: true,
      total: 1,
    },
  }

  beforeEach(() => {
    ;(useStore as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
    mockUsePathname.mockReturnValue('/en/page')
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
  })

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <SearchInput />
      </ThemeProvider>,
    )

  it('renders SearchInput with initial chips and input box', async () => {
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
    renderComponent()

    const searchInput = screen.getByPlaceholderText(
      t`sidebar_search_placeholder`,
    )
    fireEvent.change(searchInput, { target: { value: 'John' } })

    await waitFor(() =>
      expect(mockFetchPeople).toHaveBeenCalledWith({
        searchTerm: 'John',
        page: '1',
      }),
    )
  })

  it('fetches research structures when scrolled to bottom', async () => {
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

    await waitFor(() =>
      expect(mockFetchResearchStructures).toHaveBeenCalledWith({
        searchTerm: '',
        page: 1,
      }),
    )
  })

  it('toggles chip selection on click', () => {
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
})
