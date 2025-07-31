import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import DocumentSyncDialog from './DocumentSyncDialog'
import { i18n } from '@lingui/core'
import useStore from '@/stores/global_store'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockTriggerHarvestings = jest.fn()
const mockInitializeHarvesting = jest.fn()

const mockState = {
  harvesting: {
    harvestings: {
      'person-1': {
        [BibliographicPlatform.HAL]: {
          status: 'not_performed',
          result: { created: 1, updated: 1, unchanged: 1 },
        },
        [BibliographicPlatform.OPENALEX]: {
          status: 'not_performed',
          result: { created: 0, updated: 0, unchanged: 0 },
        },
      },
    },
    triggerHarvestings: mockTriggerHarvestings,
    initializeHarvesting: mockInitializeHarvesting,
  },
}

const theme = createTheme({
  utils: {
    pxToRem: (value: number) => `${value / 16}rem`,
  },
})

const renderComponent = () =>
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <DocumentSyncDialog
          openSynchronizeModal={true}
          setOpenSynchronizeModal={jest.fn()}
          personUid='person-1'
        />
      </I18nProvider>
    </ThemeProvider>,
  )

describe('DocumentSyncDialog - Behavior', () => {
  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
    mockTriggerHarvestings.mockClear()
  })

  it('toggles a platform and triggers harvesting only for selected platforms', async () => {
    renderComponent()

    const halButton = screen.getByRole('button', { name: 'Hal' })
    const openAlexButton = screen.getByRole('button', { name: 'OpenAlex' })

    expect(halButton).toBeInTheDocument()
    expect(openAlexButton).toBeInTheDocument()

    // Click to deselect HAL
    fireEvent.click(halButton)

    // Click "Synchronize" button
    const syncButton = screen.getByRole('button', {
      name: i18n.t('documents_page_synchronize_modal_synchronize_button'),
    })
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(mockTriggerHarvestings).toHaveBeenCalledWith('person-1', [
        BibliographicPlatform.SCANR,
        BibliographicPlatform.IDREF,
        BibliographicPlatform.OPENALEX,
        BibliographicPlatform.SCOPUS,
      ])
    })
  })
})
