import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import OutsideHalMissingIdCard, {
  OutsideHalMissingIdCardProps,
} from '@/app/[lang]/documents/components/HalStatusBadge/OutsideHalMissingIdCard'

jest.mock('@/utils/runtimeEnv', () => ({
  getRuntimeEnv: () => ({
    NEXT_PUBLIC_HAL_CREATE_ID_URL: 'hal_create_id_url',
  }),
}))

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

const renderComponent = (props: OutsideHalMissingIdCardProps) => {
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <OutsideHalMissingIdCard {...props} />
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
    renderComponent({ onClose: mockClose })

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
        'documents_page_hal_status_badge_missing_id_hal_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_tooltip_card_missing_id_label',
      ),
    ).toBeInTheDocument()
    const addIdHALButton = screen.queryByText(
      'documents_page_hal_status_badge_missing_id_tooltip_card_add_id_button',
    )
    expect(addIdHALButton).toBeInTheDocument()
    if (addIdHALButton) fireEvent.click(addIdHALButton)
    expect(mockRouter.push).toHaveBeenCalledTimes(1)
    const pushedUrl = (mockRouter.push as jest.Mock).mock.calls[0][0] as string
    expect(pushedUrl).toContain('/en/account')

    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_tooltip_card_missing_id_create_id_label',
        { exact: false },
      ),
    ).toBeInTheDocument()
    const link = screen.queryByText(
      'documents_page_hal_status_badge_tooltip_card_missing_id_create_id_link',
      { exact: false },
    )
    expect(link).toBeInTheDocument()
    if (link) fireEvent.click(link)
    expect(global.open).toHaveBeenCalledWith(
      'hal_create_id_url',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
