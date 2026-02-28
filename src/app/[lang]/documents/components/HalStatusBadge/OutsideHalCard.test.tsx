import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { t } from '@lingui/core/macro'
import OutsideHalCard, {
  OutsideHalCardProps,
} from '@/app/[lang]/documents/components/HalStatusBadge/OutsideHalCard'

const mockRouter = {
  push: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: () => '/en/documents/',
}))

const theme = createTheme({
  spacing: (factor: number) => `${factor * 8}px`,
})

global.open = jest.fn()

const renderComponent = (props: OutsideHalCardProps) => {
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <OutsideHalCard {...props} />
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

describe('NotInSyncHalCollectionCard Component', () => {
  const mockClose = jest.fn()

  it('displays elements correctly', async () => {
    renderComponent({ onClose: mockClose, documentUid: 'doc1' })

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(
      screen.queryByText('documents_page_hal_status_outside_hal'),
    ).toBeInTheDocument()
    const closeButton = screen.queryByTestId('CloseIcon')
    expect(closeButton).toBeInTheDocument()
    if (closeButton) fireEvent.click(closeButton)
    expect(mockClose).toHaveBeenCalled()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_hal_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_tooltip_card_not_in_hal_label',
      ),
    ).toBeInTheDocument()
    const addInHALButton = screen.queryByText(
      'documents_page_hal_status_badge_not_in_hal_tooltip_card_download_button',
    )
    expect(addInHALButton).toBeInTheDocument()
    if (addInHALButton) fireEvent.click(addInHALButton)
    expect(mockRouter.push).toHaveBeenCalledTimes(1)
    let pushedUrl = (mockRouter.push as jest.Mock).mock.calls[0][0] as string
    expect(pushedUrl).toContain('/en/documents/doc1')
    expect(pushedUrl).toContain('tab=add_in_hal')
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_tooltip_card_not_in_hal_go_to_profile_label',
        { exact: false },
      ),
    ).toBeInTheDocument()
    const link = screen.queryByText(
      'documents_page_hal_status_badge_tooltip_card_not_in_hal_go_to_profile_link',
      { exact: false },
    )
    expect(link).toBeInTheDocument()
    if (link) fireEvent.click(link)
    expect(mockRouter.push).toHaveBeenCalledTimes(2)
    pushedUrl = (mockRouter.push as jest.Mock).mock.calls[1][0] as string
    expect(pushedUrl).toContain('/en/account')
  })
})
