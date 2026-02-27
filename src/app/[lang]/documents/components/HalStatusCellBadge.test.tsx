import useStore from '@/stores/global_store'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import HalStatusCellBadge, {
  HalStatusCellBadgeProps,
  HalStatusCellType,
} from '@/app/[lang]/documents/components/HalStatusCellBadge'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import AttachFileOffIcon from '@/app/theme/icons/AttachFileOffIcon'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: jest.fn(),
  usePathname: () => '',
}))

const mockState = (ownPerspective: boolean) => {
  return {
    user: {
      ownPerspective: ownPerspective,
    },
  }
}

const renderComponent = (props: HalStatusCellBadgeProps) => {
  render(
    <I18nProvider i18n={i18n}>
      <HalStatusCellBadge {...props} />
    </I18nProvider>,
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

describe('HalStatusCellBadge type OutsideHalMissingId Component', () => {
  it('displays the correct chip without tooltip if ownPerspective is false', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(false)),
    )

    renderComponent({ type: HalStatusCellType.OutsideHalMissingId })

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    const chip = screen.getByText(
      i18n.t('documents_page_hal_status_outside_hal'),
    )
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_missing_id_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_missing_id_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
  })

  it('displays the correct chip with tooltip if ownPerspective is true', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(true)),
    )

    renderComponent({ type: HalStatusCellType.OutsideHalMissingId })

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    const chip = screen.getByText(
      i18n.t('documents_page_hal_status_outside_hal'),
    )
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_missing_id_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_missing_id_hal_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
  })
})

describe('HalStatusCellBadge type OutsideHal Component', () => {
  it('displays the correct chip without tooltip if ownPerspective is false', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(false)),
    )

    renderComponent({ type: HalStatusCellType.OutsideHal, documentUid: 'doc1' })

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    const chip = screen.getByText(
      i18n.t('documents_page_hal_status_outside_hal'),
    )
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
  })

  it('displays the correct chip with tooltip if ownPerspective is true', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(true)),
    )

    renderComponent({ type: HalStatusCellType.OutsideHal, documentUid: 'doc1' })

    expect(screen.queryByTestId('AttachFileIcon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    const chip = screen.getByText(
      i18n.t('documents_page_hal_status_outside_hal'),
    )
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_hal_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_not_in_hal_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
  })
})

describe('HalStatusCellBadge type NotInSyncWithCollection Component', () => {
  it('displays the correct chip without tooltip if ownPerspective is false', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(false)),
    )

    const icon = <AttachFileIcon />

    renderComponent({
      type: HalStatusCellType.NotInSyncWithCollection,
      icon: icon,
      documentUid: 'doc1',
      acronyms: ['ABC'],
      halSubmitType: 'file',
      hasBeenUpdated: true,
      isOutOfCollection: true,
      halUrl: '',
    })

    expect(screen.queryByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    const chip = screen.getByText(i18n.t('documents_page_hal_status_in_hal'))
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
  })

  it('displays the correct chip with tooltip if ownPerspective is true', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(true)),
    )

    const icon = <AttachFileIcon />

    renderComponent({
      type: HalStatusCellType.NotInSyncWithCollection,
      icon: icon,
      documentUid: 'doc1',
      acronyms: ['ABC'],
      halSubmitType: 'file',
      hasBeenUpdated: true,
      isOutOfCollection: true,
      halUrl: '',
    })

    expect(screen.queryByTestId('AttachFileIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('AttachFileOffIcon')).not.toBeInTheDocument()
    const chip = screen.getByText(i18n.t('documents_page_hal_status_in_hal'))
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_header',
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_header',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('hal_submit_type_file')).toBeInTheDocument()
  })
})

describe('HalStatusCellBadge type InCollection Component', () => {
  it('displays the correct chip without tooltip if ownPerspective is false', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(false)),
    )
    const icon = <AttachFileOffIcon />

    renderComponent({
      type: HalStatusCellType.InCollection,
      icon: icon,
      acronyms: ['ABC'],
      halSubmitType: 'notice',
      halUrl: '',
    })

    expect(screen.queryByTestId('AttachFileOffIcon')).toBeInTheDocument()
    const chip = screen.getByText(i18n.t('documents_page_hal_status_in_hal'))
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collection_label',
        { exact: false },
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collection_label',
        { exact: false },
      ),
    ).not.toBeInTheDocument()
  })

  it('displays the correct chip with tooltip if ownPerspective is true', async () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState(true)),
    )
    const icon = <AttachFileOffIcon />

    renderComponent({
      type: HalStatusCellType.InCollection,
      icon: icon,
      acronyms: ['ABC'],
      halSubmitType: 'notice',
      halUrl: '',
    })

    expect(screen.queryByTestId('AttachFileOffIcon')).toBeInTheDocument()
    const chip = screen.getByText(i18n.t('documents_page_hal_status_in_hal'))
    expect(chip).toBeInTheDocument()
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collection_label',
        { exact: false },
      ),
    ).not.toBeInTheDocument()
    fireEvent.click(chip)
    expect(
      screen.queryByText(
        'documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collection_label',
        { exact: false },
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('hal_submit_type_notice', { exact: false }),
    ).toBeInTheDocument()
  })
})
