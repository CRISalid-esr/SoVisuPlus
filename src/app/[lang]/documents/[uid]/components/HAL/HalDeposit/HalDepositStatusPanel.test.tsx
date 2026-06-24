import { render, screen } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import useStore from '@/stores/global_store'
import type { HalDepositView } from '@/stores/halDepositSlice'
import { HalDepositStatusPanel } from './HalDepositStatusPanel'

jest.mock('@/stores/global_store', () => ({ __esModule: true, default: jest.fn() }))

const refreshDeposit = jest.fn()

const deposit = (overrides: Partial<HalDepositView>): HalDepositView =>
  ({
    id: 1,
    documentUid: 'doc-1',
    personUid: 'p-1',
    status: 'verify',
    halId: null,
    halUrl: null,
    comment: null,
    lastError: null,
    createdAt: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }) as HalDepositView

const renderPanel = (d: HalDepositView) =>
  render(
    <I18nProvider i18n={i18n}>
      <HalDepositStatusPanel deposit={d} onNavigateTab={() => {}} />
    </I18nProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({ halDeposit: { refreshDeposit } }),
  )
})

describe('HalDepositStatusPanel', () => {
  it('shows the published view with the public HAL link for accept', () => {
    renderPanel(
      deposit({
        status: 'accept',
        halId: 'hal-1',
        halUrl: 'https://hal.science/hal-1',
      }),
    )
    expect(
      screen.getByText('hal_deposit_status_published_title'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /hal-1/ })).toHaveAttribute(
      'href',
      'https://hal.science/hal-1',
    )
    expect(
      screen.queryByText('hal_deposit_status_refresh'),
    ).not.toBeInTheDocument()
  })

  it('offers a refresh action while under moderation (verify)', () => {
    renderPanel(deposit({ status: 'verify', halId: 'hal-2' }))
    expect(
      screen.getByText('hal_deposit_status_moderation_title'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('hal_deposit_status_refresh'),
    ).toBeInTheDocument()
  })

  it('shows the error message for a failed submission', () => {
    renderPanel(deposit({ status: 'error', lastError: 'invalid TEI' }))
    expect(
      screen.getByText('hal_deposit_status_failed_title'),
    ).toBeInTheDocument()
    expect(screen.getByText('invalid TEI')).toBeInTheDocument()
  })
})
