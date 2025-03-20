import useStore from '@/stores/global_store'
import { BibliographicPlatform } from '@/types/BibliographicPlatform' // Ensure import
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import Sources from './Sources'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
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
      fontWeightMedium: 500,
      lineHeight: { lineHeight20px: '20px' },
    },
  }),
}))

// Mock window.open to test external link clicks
global.open = jest.fn()

// Mock bibliographic metadata inside jest.mock()
jest.mock('@/types/BibliographicPlatform', () => {
  const actual = jest.requireActual('@/types/BibliographicPlatform') // Preserve actual enum
  return {
    ...actual,
    BibliographicPlatformMetadata: {
      [actual.BibliographicPlatform.HAL]: { icon: '/icons/hal.png' },
      [actual.BibliographicPlatform.SCANR]: { icon: '/icons/scanr.png' },
      [actual.BibliographicPlatform.IDREF]: { icon: '/icons/idref.png' },
      [actual.BibliographicPlatform.OPENALEX]: { icon: '/icons/openalex.png' },
      [actual.BibliographicPlatform.SCOPUS]: { icon: '/icons/scopus.png' },
    },
  }
})

// Mock document data
const mockState = {
  document: {
    selectedDocument: {
      records: [
        {
          platform: BibliographicPlatform.HAL,
          url: 'https://hal.archives-ouvertes.fr',
        },
        {
          platform: BibliographicPlatform.SCANR,
          url: 'https://scanr.enseignementsup-recherche.gouv.fr',
        },
        { platform: BibliographicPlatform.IDREF, url: 'https://www.idref.fr' },
        {
          platform: BibliographicPlatform.OPENALEX,
          url: 'https://openalex.org',
        },
        {
          platform: BibliographicPlatform.SCOPUS,
          url: 'https://www.scopus.com',
        },
      ],
    },
  },
}

describe('Sources Component', () => {
  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
    jest.clearAllMocks()
  })

  const theme = createTheme({
    typography: {
      fontWeightRegular: 400,
      fontWeightMedium: 500,
    },
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
          <Sources />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders sources label and edit button', () => {
    renderComponent()

    expect(
      screen.getByText('document_details_page_sources_row_label'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('document_details_page_sources_row_update_source'),
    ).toBeInTheDocument()
  })

  it('renders bibliographic sources as chips', () => {
    renderComponent()

    expect(screen.getByText('hal')).toBeInTheDocument()
    expect(screen.getByText('scanr')).toBeInTheDocument()
    expect(screen.getByText('idref')).toBeInTheDocument()
    expect(screen.getByText('openalex')).toBeInTheDocument()
    expect(screen.getByText('scopus')).toBeInTheDocument()
  })

  it('opens source link on chip click', () => {
    renderComponent()

    const halChip = screen.getByText('hal')
    fireEvent.click(halChip)
    expect(global.open).toHaveBeenCalledWith(
      'https://hal.archives-ouvertes.fr',
      '_blank',
    )

    const scanrChip = screen.getByText('scanr')
    fireEvent.click(scanrChip)
    expect(global.open).toHaveBeenCalledWith(
      'https://scanr.enseignementsup-recherche.gouv.fr',
      '_blank',
    )

    const idrefChip = screen.getByText('idref')
    fireEvent.click(idrefChip)
    expect(global.open).toHaveBeenCalledWith('https://www.idref.fr', '_blank')

    const openalexChip = screen.getByText('openalex')
    fireEvent.click(openalexChip)
    expect(global.open).toHaveBeenCalledWith('https://openalex.org', '_blank')

    const scopusChip = screen.getByText('scopus')
    fireEvent.click(scopusChip)
    expect(global.open).toHaveBeenCalledWith('https://www.scopus.com', '_blank')
  })

  it('renders the edit button and handles click', () => {
    renderComponent()

    const editButton = screen.getByText(
      i18n.t('document_details_page_sources_row_update_source'),
    )
    expect(editButton).toBeInTheDocument()

    fireEvent.click(editButton)

    // No specific event expected, but ensures the button is clickable
    expect(editButton).toBeInTheDocument()
  })
})
