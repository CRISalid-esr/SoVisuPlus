import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { t } from '@lingui/core/macro'
import NotInSyncHalCollectionCard, {
  NotInSyncHalCollectionCardProps,
} from '@/app/[lang]/documents/components/HalStatusBadge/NotInSyncHalCollectionCard'

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

const renderComponent = (props: NotInSyncHalCollectionCardProps) => {
  render(
    <ThemeProvider theme={theme}>
      <I18nProvider i18n={i18n}>
        <NotInSyncHalCollectionCard {...props} />
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
  const icon = <AttachFileIcon />

  it('displays elements correctly', async () => {
    renderComponent({
      update: true,
      isOutOfCollection: true,
      icon: icon,
      acronyms: ['ABC'],
      halSubmitTypeStr: t`hal_submit_type_file`,
      halUrl: 'url',
      onClose: mockClose,
      documentUid: 'doc1',
    })

    expect(screen.queryByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(
      screen.queryByText('documents_page_hal_status_in_hal'),
    ).toBeInTheDocument()
    const closeButton = screen.queryByTestId('CloseIcon')
    expect(closeButton).toBeInTheDocument()
    if (closeButton) fireEvent.click(closeButton)
    expect(mockClose).toHaveBeenCalled()
    expect(screen.queryByText('hal_submit_type_file')).toBeInTheDocument()

    //with isOutCollection true
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_message',
        { exact: false },
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('ABC', { exact: false })).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_link',
        { exact: false },
      ),
    ).toBeInTheDocument()
    const link = screen.getByRole('button', { name: /see affiliation/ })
    expect(link).toBeInTheDocument()
    fireEvent.click(link)
    expect(mockRouter.push).toHaveBeenCalledTimes(1)
    let pushedUrl = (mockRouter.push as jest.Mock).mock.calls[0][0] as string
    expect(pushedUrl).toContain('/en/documents/doc1')
    expect(pushedUrl).toContain('tab=authors')

    //with halUrl set and update true
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_message',
      ),
    ).toBeInTheDocument()
    const updateInHALButton = screen.queryByText(
      'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_update_button',
    )
    expect(updateInHALButton).toBeInTheDocument()
    if (updateInHALButton) fireEvent.click(updateInHALButton)
    expect(mockRouter.push).toHaveBeenCalledTimes(2)
    pushedUrl = (mockRouter.push as jest.Mock).mock.calls[1][0] as string
    expect(pushedUrl).toContain('/en/documents/doc1')
    expect(pushedUrl).toContain('tab=update_in_hal')

    //with halUrl set
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
      update: true,
      isOutOfCollection: true,
      icon: icon,
      acronyms: ['ABC', 'DEF'],
      halSubmitTypeStr: t`hal_submit_type_file`,
      halUrl: 'url',
      onClose: mockClose,
      documentUid: 'doc1',
    })

    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collections_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collections_tooltip_card_info_box_message',
        { exact: false },
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('ABC, DEF', { exact: false })).toBeInTheDocument()
  })

  it('should not displays out of collection warning if isOutOfCollection is false', async () => {
    renderComponent({
      update: true,
      isOutOfCollection: false,
      icon: icon,
      acronyms: ['ABC', 'DEF'],
      halSubmitTypeStr: t`hal_submit_type_file`,
      halUrl: 'url',
      onClose: mockClose,
      documentUid: 'doc1',
    })

    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collections_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collections_tooltip_card_info_box_message',
        { exact: false },
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('ABC, DEF', { exact: false }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_link',
        { exact: false },
      ),
    ).not.toBeInTheDocument()
    const link = screen.queryByRole('button', { name: /see affiliation/ })
    expect(link).not.toBeInTheDocument()
  })

  it('should not displays update info box if halUrl is not set or update is false. If not hal url, should not also displays see hal file button', async () => {
    renderComponent({
      update: true,
      isOutOfCollection: true,
      icon: icon,
      acronyms: ['ABC', 'DEF'],
      halSubmitTypeStr: t`hal_submit_type_file`,
      halUrl: null,
      onClose: mockClose,
      documentUid: 'doc1',
    })

    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_message',
      ),
    ).not.toBeInTheDocument()
    let updateInHALButton = screen.queryByText(
      'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_update_button',
    )
    expect(updateInHALButton).not.toBeInTheDocument()

    let seeFileButton = screen.queryByText(
      'documents_page_hal_status_badge_tooltip_card_see_file',
    )
    expect(seeFileButton).not.toBeInTheDocument()

    renderComponent({
      update: false,
      isOutOfCollection: true,
      icon: icon,
      acronyms: ['ABC', 'DEF'],
      halSubmitTypeStr: t`hal_submit_type_file`,
      halUrl: 'url',
      onClose: mockClose,
      documentUid: 'doc1',
    })

    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_message',
      ),
    ).not.toBeInTheDocument()
    updateInHALButton = screen.queryByText(
      'documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_update_button',
    )
    expect(updateInHALButton).not.toBeInTheDocument()

    seeFileButton = screen.queryByText(
      'documents_page_hal_status_badge_tooltip_card_see_file',
    )
    expect(seeFileButton).toBeInTheDocument()
  })
})
