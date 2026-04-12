import React from 'react'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import HalControl from '@/app/[lang]/account/components/myProfile/components/identifiers/HalControl'
import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@prisma/client'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn()
const mockUseSearchParams = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockUseSearchParams(),
}))

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock(
  '@/[lang]/account/components/myProfile/components/identifiers/HalLoginButton',
  () => ({
    HalLoginButton: ({ halProvided }: { halProvided: boolean }) => (
      <a data-testid='hal-login-button'>
        HalLoginButton(halProvided={String(halProvided)})
      </a>
    ),
  }),
)

// ── i18n ──────────────────────────────────────────────────────────────────────

i18n.load('en', {
  hal_control_helper: 'Helper text for HAL control (can be long).',
  hal_account_linked_tooltip: 'Linked to HAL account',
  hal_control_not_available: 'hal_control_not_available',
  hal_authentication_success: 'HAL authentication success',
  hal_authentication_failure: 'HAL authentication failure',
  hal_authentication_failure_no_ticket: 'No ticket',
  hal_authentication_failure_no_session: 'No session',
  hal_authentication_failure_user_not_found: 'User not found',
  hal_authentication_failure_misconfig: 'Misconfig',
  hal_auth_missing_data: 'Missing data',
  hal_unavailable_data: 'HAL unavailable',
  hal_missing_identifiers: 'Missing identifiers',
  hal_identifier_insert_failure: 'Insert failure',
  hal_authentication_failure_wrong_protocol: 'Wrong protocol',
})
i18n.activate('en')

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderWithProviders = () =>
  render(
    <I18nProvider i18n={i18n}>
      <HalControl />
    </I18nProvider>,
  )

const makeStore = (
  identifiers: Array<{ type: string; value: string }>,
  ownPerspective = true,
) => {
  const person = { getIdentifiers: () => identifiers }
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      user: {
        connectedUser: { person },
        currentPerspective: null,
        ownPerspective,
      },
    }),
  )
}

// ── Own-perspective (full view) ────────────────────────────────────────────────

describe('HalControl — own perspective', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('always shows helper text', () => {
    makeStore([])
    renderWithProviders()
    expect(screen.getByText(i18n.t('hal_control_helper'))).toBeInTheDocument()
  })

  it('when no HAL identifier and no login: shows only the button', () => {
    makeStore([])
    renderWithProviders()

    expect(screen.getByTestId('hal-login-button')).toHaveTextContent(
      'halProvided=false',
    )
    expect(screen.queryByText('idHal_s')).not.toBeInTheDocument()
    expect(screen.queryByText('idHal_i')).not.toBeInTheDocument()
    expect(screen.queryByText('hal_login')).not.toBeInTheDocument()
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()
  })

  it('when idHal_s exists but no login: shows idHal badge and button, no link icon', () => {
    makeStore([{ type: PersonIdentifierType.idhals, value: 'jacques-dupont' }])
    renderWithProviders()

    expect(screen.getByText('idHal_s')).toBeInTheDocument()
    expect(screen.getByText('jacques-dupont')).toBeInTheDocument()
    expect(screen.getByTestId('hal-login-button')).toHaveTextContent(
      'halProvided=true',
    )
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()
    expect(screen.queryByText('hal_login')).not.toBeInTheDocument()
  })

  it('when idHal_i exists but no login: shows idHal_i badge and button', () => {
    makeStore([{ type: PersonIdentifierType.idhali, value: 'jean-martin' }])
    renderWithProviders()

    expect(screen.getByText('idHal_i')).toBeInTheDocument()
    expect(screen.getByText('jean-martin')).toBeInTheDocument()
    expect(screen.getByTestId('hal-login-button')).toHaveTextContent(
      'halProvided=true',
    )
  })

  it('prefers idHal_s over idHal_i when both are present', () => {
    makeStore([
      { type: PersonIdentifierType.idhals, value: 'hal-s-value' },
      { type: PersonIdentifierType.idhali, value: 'hal-i-value' },
    ])
    renderWithProviders()

    expect(screen.getByText('idHal_s')).toBeInTheDocument()
    expect(screen.getByText('hal-s-value')).toBeInTheDocument()
    expect(screen.queryByText('idHal_i')).not.toBeInTheDocument()
  })

  it('when idHal and login both exist: shows link icon, both badges, no button', () => {
    makeStore([
      { type: PersonIdentifierType.idhals, value: 'jacques-dupont' },
      { type: PersonIdentifierType.hal_login, value: 'jdupont' },
    ])
    renderWithProviders()

    expect(screen.getByText('idHal_s')).toBeInTheDocument()
    expect(screen.getByText('jacques-dupont')).toBeInTheDocument()
    expect(screen.getByText('hal_login')).toBeInTheDocument()
    expect(screen.getByText('jdupont')).toBeInTheDocument()
    expect(screen.getByTestId('LinkIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('hal-login-button')).not.toBeInTheDocument()
  })

  it('shows snackbar on ?success=hal_authentication_success', () => {
    makeStore([])
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams([['success', 'hal_authentication_success']]),
    )
    renderWithProviders()

    expect(
      screen.getByText(i18n.t('hal_authentication_success')),
    ).toBeInTheDocument()
  })

  it('shows snackbar on ?error=hal_authentication_failure_wrong_protocol', () => {
    makeStore([])
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams([
        ['error', 'hal_authentication_failure_wrong_protocol'],
      ]),
    )
    renderWithProviders()

    expect(
      screen.getByText(i18n.t('hal_authentication_failure_wrong_protocol')),
    ).toBeInTheDocument()
  })

  it('ignores non-hal URL params', () => {
    makeStore([])
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams([['success', 'orcid_authentication_success']]),
    )
    renderWithProviders()

    expect(
      screen.queryByText(i18n.t('hal_authentication_success')),
    ).not.toBeInTheDocument()
  })
})

// ── Read-only (non-own) perspective ───────────────────────────────────────────

describe('HalControl — read-only (non-own) perspective', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('shows "not available" when no HAL identifier', () => {
    makeStore([], false)
    renderWithProviders()

    expect(screen.getByText('hal_control_not_available')).toBeInTheDocument()
  })

  it('shows idHal value when an idHal_s identifier is present', () => {
    makeStore(
      [{ type: PersonIdentifierType.idhals, value: 'jacques-dupont' }],
      false,
    )
    renderWithProviders()

    expect(screen.getByText('idHal_s')).toBeInTheDocument()
    expect(screen.getByText('jacques-dupont')).toBeInTheDocument()
  })

  it('shows idHal value when an idHal_i identifier is present', () => {
    makeStore(
      [{ type: PersonIdentifierType.idhali, value: 'jean-martin' }],
      false,
    )
    renderWithProviders()

    expect(screen.getByText('idHal_i')).toBeInTheDocument()
    expect(screen.getByText('jean-martin')).toBeInTheDocument()
  })

  it('does not show the login button', () => {
    makeStore(
      [{ type: PersonIdentifierType.idhals, value: 'jacques-dupont' }],
      false,
    )
    renderWithProviders()

    expect(screen.queryByTestId('hal-login-button')).not.toBeInTheDocument()
  })

  it('does not show the helper text', () => {
    makeStore([], false)
    renderWithProviders()

    expect(
      screen.queryByText(i18n.t('hal_control_helper')),
    ).not.toBeInTheDocument()
  })

  it('does not show a snackbar even when URL params are present', () => {
    makeStore([], false)
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams([['success', 'hal_authentication_success']]),
    )
    renderWithProviders()

    expect(
      screen.queryByText(i18n.t('hal_authentication_success')),
    ).not.toBeInTheDocument()
  })
})
