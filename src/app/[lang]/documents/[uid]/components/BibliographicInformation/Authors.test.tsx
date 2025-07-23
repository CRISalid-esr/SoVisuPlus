import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import Authors from './Authors'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock MUI Theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e', dark: '#9a0036' },
      lightSecondaryContainer: '#f0f0f0',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getContrastText: (_: string) => '#fff',
    },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: {
      fontWeightRegular: 400,
      lineHeight: { lineHeight20px: '20px' },
    },
  }),
}))

// Mock document data
const mockState = {
  document: {
    selectedDocument: {
      contributions: [
        {
          person: {
            displayName: 'John Doe',
            external: false,
            slug: 'john-doe',
          },
        },
        {
          person: {
            displayName: 'Jane Smith',
            external: true,
            slug: 'jane-smith',
          },
        },
      ],
    },
  },
}

describe('Authors Component', () => {
  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
  })

  const theme = createTheme({
    typography: { fontWeightRegular: 400 },
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e', dark: '#9a0036' },
      lightSecondaryContainer: '#f0f0f0',
    },
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
  })

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <Authors />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders author button', () => {
    renderComponent()

    expect(
      screen.getByText('document_details_page_authors_row_update_author'),
    ).toBeInTheDocument()
  })

  it('renders author chips when there are contributions', () => {
    renderComponent()

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('renders the edit button and handles click', () => {
    renderComponent()

    const editButton = screen.getByText(
      i18n.t('document_details_page_authors_row_update_author'),
    )
    expect(editButton).toBeInTheDocument()

    fireEvent.click(editButton)

    // No specific action expected, but ensures the button is clickable
    expect(editButton).toBeInTheDocument()
  })
  it('should navigate to the correct URL when an internal author is clicked', () => {
    renderComponent()

    const internalAuthorChip = screen.getByText('John Doe')
    fireEvent.click(internalAuthorChip)

    expect(mockRouter.push).toHaveBeenCalledWith(
      '/en/documents?perspective=john-doe',
    )
  })
})
