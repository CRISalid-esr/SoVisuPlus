import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Authors from './Authors'
import Identifiers from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/Identifiers'
import clearAllMocks = jest.clearAllMocks
import { PublicationIdentifier } from '@/types/PublicationIdentifier'
import { PublicationIdentifierType } from '@prisma/client'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: { primary: { main: '#1976d2' }, grey: { 300: '#ddd' } },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: {
      fontWeightRegular: 400,
      lineHeight: {
        lineHeight20px: '20px',
      },
    },
  }),
}))

const theme = createTheme({
  typography: {
    fontWeightRegular: 400,
  },
  spacing: (factor: number) => `${factor * 8}px`,
  palette: {
    primary: { main: '#1976d2' },
  },
  utils: { pxToRem: (value: number) => `${value / 16}rem` },
})

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockResolvedValue('success'),
    },
  })
})

describe('Identifiers Component', () => {
  beforeEach(() => {
    clearAllMocks()
  })

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <Identifiers />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('should not display same identifier twice', async () => {
    const mockState = {
      document: {
        selectedDocument: {
          records: [
            {
              sourceIdentifier: 'sudoc0001',
              identifiers: [
                new PublicationIdentifier(
                  PublicationIdentifierType.SUDOCPPN,
                  'sudoc-ppn-0001',
                ),
                new PublicationIdentifier(
                  PublicationIdentifierType.NNT,
                  'nnt-0001',
                ),
              ],
              platform: 'scanr',
            },
            {
              sourceIdentifier: 'hal0001',
              identifiers: [
                new PublicationIdentifier(
                  PublicationIdentifierType.SUDOCPPN,
                  'sudoc-ppn-0001',
                ),
                new PublicationIdentifier(
                  PublicationIdentifierType.HAL,
                  'hal-0001',
                ),
              ],
              platform: 'hal',
            },
          ],
        },
      },
    }

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )

    renderComponent()

    expect(screen.getByText('SUDOC-PPN : sudoc-ppn-0001')).toBeInTheDocument()

    expect(screen.getByText('NNT : nnt-0001')).toBeInTheDocument()

    expect(screen.getByText('HAL : hal-0001')).toBeInTheDocument()

    expect(screen.getAllByText('SUDOC-PPN : sudoc-ppn-0001')).toHaveLength(1)

    expect(
      screen.queryByText('document_details_page_identifiers_copy_message'),
    ).not.toBeInTheDocument()

    const sudocButton = screen.getByText('SUDOC-PPN : sudoc-ppn-0001')

    fireEvent.click(sudocButton)

    await waitFor(() => {
      const snackbar = screen.getByText(
        'SUDOC-PPN ' + 'document_details_page_identifiers_copy_message',
      )
      expect(snackbar).toBeInTheDocument()
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'sudoc-ppn-0001',
      )
    })
  })

  it('should not display identifiers without value', () => {
    const mockState = {
      document: {
        selectedDocument: {
          records: [
            {
              sourceIdentifier: 'sudoc0001',
              identifiers: [
                new PublicationIdentifier(
                  PublicationIdentifierType.SUDOCPPN,
                  'sudoc-ppn-0001',
                ),
                new PublicationIdentifier(PublicationIdentifierType.NNT, null),
              ],
              platform: 'scanr',
            },
            {
              sourceIdentifier: 'hal0001',
              identifiers: [
                new PublicationIdentifier(
                  PublicationIdentifierType.SUDOCPPN,
                  'sudoc-ppn-0001',
                ),
                new PublicationIdentifier(
                  PublicationIdentifierType.HAL,
                  'hal-0001',
                ),
              ],
              platform: 'hal',
            },
          ],
        },
      },
    }

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )

    renderComponent()

    expect(screen.getByText('SUDOC-PPN : sudoc-ppn-0001')).toBeInTheDocument()

    expect(screen.getAllByText('SUDOC-PPN : sudoc-ppn-0001')).toHaveLength(1)

    expect(screen.getByText('HAL : hal-0001')).toBeInTheDocument()

    expect(screen.queryByText('NNT : nnt-0001')).not.toBeInTheDocument()
  })

  it('should display sourceIdentifiers instead of identifiers if there is no identifiers and remove duplicates', async () => {
    const mockState = {
      document: {
        selectedDocument: {
          records: [
            {
              sourceIdentifier: 'sudoc0001',
              identifiers: [],
              platform: 'scanr',
            },
            {
              sourceIdentifier: 'hal0001',
              identifiers: [],
              platform: 'hal',
            },
            {
              sourceIdentifier: 'sudoc0001',
              identifiers: [],
              platform: 'scanr',
            },
            {
              sourceIdentifier: 'sudoc0001',
              identifiers: [],
              platform: 'scopus',
            },
          ],
        },
      },
    }

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )

    renderComponent()

    expect(screen.getByText('ScanR : sudoc0001')).toBeInTheDocument()

    expect(screen.getByText('Scopus : sudoc0001')).toBeInTheDocument()

    expect(screen.getAllByText('ScanR : sudoc0001')).toHaveLength(1)

    expect(screen.getAllByText('Scopus : sudoc0001')).toHaveLength(1)

    expect(screen.getByText('HAL : hal0001')).toBeInTheDocument()

    expect(
      screen.queryByText(
        'document_details_page_identifiers_copy_default_message',
      ),
    ).not.toBeInTheDocument()

    const sudocButton = screen.getByText('ScanR : sudoc0001')

    fireEvent.click(sudocButton)

    await waitFor(() => {
      const snackbar = screen.getByText(
        'document_details_page_identifiers_copy_default_message',
      )
      expect(snackbar).toBeInTheDocument()
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('sudoc0001')
    })
  })

  it("should display 'there is no identifiers message' if there is both no identifier and sourceIdentifier", () => {
    const mockState = {
      document: {
        selectedDocument: {
          records: [
            {
              identifiers: [],
            },
            {
              identifiers: [],
            },
          ],
        },
      },
    }

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )

    renderComponent()

    expect(
      screen.getByText(
        'document_details_page_identifiers_no_identifiers_message',
      ),
    ).toBeInTheDocument()
  })
})
