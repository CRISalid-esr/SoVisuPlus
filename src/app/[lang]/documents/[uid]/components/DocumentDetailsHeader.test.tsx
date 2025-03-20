import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentDetailsHeader from './DocumentDetailsHeader'

// Mock `useRouter`
const mockRouter = {
  back: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock MUI Theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: { primary: { main: '#1976d2' } },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
  }),
}))

describe('DocumentDetailsHeader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const theme = createTheme({
    typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
    palette: { primary: { main: '#1976d2' } },
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
  })

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <DocumentDetailsHeader />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders back button and title', () => {
    renderComponent()

    expect(screen.getByRole('button')).toBeInTheDocument() // Ensures the button exists
    expect(
      screen.getByText(i18n.t('document_details_page_main_title')),
    ).toBeInTheDocument()
  })

  it('calls router.back() when clicking the back button', () => {
    renderComponent()

    const backButton = screen.getByRole('button')
    fireEvent.click(backButton)

    expect(mockRouter.back).toHaveBeenCalledTimes(1)
  })
})
