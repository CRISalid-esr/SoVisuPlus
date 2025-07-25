import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import useStore from '@/stores/global_store'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import dayjs from 'dayjs'
import PublicationDate from './PublicationDate'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
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

// Mock document data
const mockState = {
  document: {
    selectedDocument: {
      publicationDate: '2024-03-15',
    },
  },
}

describe('PublicationDate Component', () => {
  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
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
          <PublicationDate />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('displays "no date available" when publication date is missing', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ document: { selectedDocument: { publicationDate: null } } }),
    )

    renderComponent()
    expect(
      screen.getByText(
        i18n.t('documents_page_publication_date_column_no_date_available'),
      ),
    ).toBeInTheDocument()
  })

  it('displays invalid date as raw text', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        document: { selectedDocument: { publicationDate: 'invalid-date' } },
      }),
    )

    renderComponent()
    expect(screen.getByText('invalid-date')).toBeInTheDocument()
  })

  it('displays formatted publication date based on locale', () => {
    renderComponent()

    const expectedDate = dayjs('2024-03-15', 'YYYY-MM-DD').format(
      LocaleDateFormats['lang'] || 'MM-DD-YYYY',
    )
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
  })
})
