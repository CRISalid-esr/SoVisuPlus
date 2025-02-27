import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
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

// Mock Lingui `t` function
jest.mock('@lingui/macro', () => ({
  t: (key: string) => key, // Return key directly for testing
}))

// Mock MUI Theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: {
      primary: { main: '#1976d2' },
      lightSecondaryContainer: '#f0f0f0',
      onSecondaryContainer: '#000',
    },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: {
      fontWeightRegular: 400,
      lineHeight: { lineHeight20px: '20px' },
    },
  }),
}))

// Initialize Lingui i18n
i18n.load({ en: enMessages, fr: frMessages })
i18n.activate('en')

// Mock document data
const mockState = {
  document: {
    selectedDocument: {
      contributions: [
        { person: { displayName: 'John Doe' } },
        { person: { displayName: 'Jane Smith' } },
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
      lightSecondaryContainer: '#f0f0f0',
      onSecondaryContainer: '#000',
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

  it('renders author label and button', () => {
    renderComponent()

    expect(
      screen.getByText('document_details_page_authors_row_label'),
    ).toBeInTheDocument()
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
      'document_details_page_authors_row_update_author',
    )
    expect(editButton).toBeInTheDocument()

    fireEvent.click(editButton)

    // No specific action expected, but ensures the button is clickable
    expect(editButton).toBeInTheDocument()
  })
})
