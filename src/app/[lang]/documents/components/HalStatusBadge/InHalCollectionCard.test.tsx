import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import InHalCollectionCard, {
  InHalCollectionCardProps,
} from '@/app/[lang]/documents/components/HalStatusBadge/InHalCollectionCard'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { t } from '@lingui/core/macro'

const theme = createTheme({
  spacing: (factor: number) => `${factor * 8}px`,
})

global.open = jest.fn()

const renderComponent = (props: InHalCollectionCardProps) => {
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <InHalCollectionCard {...props} />
      </I18nProvider>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  act(() => {
    i18n.activate('en')
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('InHalCollectionCard Component', () => {
  const mockClose = jest.fn()
  const icon = <AttachFileIcon />

  it('displays elements correctly', async () => {
    renderComponent({
      icon: icon,
      acronyms: ['ABC'],
      halSubmitTypeStr: t`hal_submit_type_file`,
      halUrl: 'url',
      onClose: mockClose,
    })

    expect(screen.queryByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(
      screen.queryByText('documents_page_hal_status_in_hal'),
    ).toBeInTheDocument()
    const closeButton = screen.queryByTestId('CloseIcon')
    expect(closeButton).toBeInTheDocument()
    if (closeButton) fireEvent.click(closeButton)
    expect(mockClose).toHaveBeenCalled()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collection_label',
        { exact: false },
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('hal_submit_type_file', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.queryByText('ABC', { exact: false })).toBeInTheDocument()
    const seeFileButton = screen.queryByText(
      'documents_page_hal_status_badge_tooltip_card_see_file',
    )
    expect(seeFileButton).toBeInTheDocument()
    if (seeFileButton) fireEvent.click(seeFileButton)
    expect(global.open).toHaveBeenCalledWith(
      'url',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('pick right text when there is more than 2 acronyms', async () => {
    renderComponent({
      icon: icon,
      acronyms: ['ABC', 'DEF'],
      halSubmitTypeStr: t`hal_submit_type_notice`,
      halUrl: 'url',
      onClose: mockClose,
    })

    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collections_label',
        { exact: false },
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('hal_submit_type_notice', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.queryByText('ABC, DEF', { exact: false })).toBeInTheDocument()
  })

  it('should not displays see hal file button if hal url is null', async () => {
    renderComponent({
      icon: icon,
      acronyms: ['ABC'],
      halSubmitTypeStr: t`hal_submit_type_file`,
      halUrl: null,
      onClose: mockClose,
    })

    const seeFileButton = screen.queryByText(
      'documents_page_hal_status_badge_tooltip_card_see_file',
    )
    expect(seeFileButton).not.toBeInTheDocument()
    if (seeFileButton) fireEvent.click(seeFileButton)
    expect(global.open).not.toHaveBeenCalled()
  })
})
