import React from 'react'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import HalControl from '@/app/[lang]/account/components/myProfile/components/identifiers/HalControl'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import useStore from '@/stores/global_store'

/**
 * Mocks
 */
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

i18n.load({
  en: {
    hal_control_helper: 'Helper text for HAL control (can be long).',
    hal_account_linked_tooltip: 'Linked to HAL account',
    hal_identifier_not_available: 'Not available',
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
  },
})
i18n.activate('en')

const renderWithProviders = () =>
  render(
    <I18nProvider i18n={i18n}>
      <HalControl />
    </I18nProvider>,
  )

const makeStoreWithIdentifiers = (
  identifiers: Array<{ type: string; value: string }>,
) => {
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      user: {
        connectedUser: {
          person: {
            getIdentifiers: () => identifiers,
          },
        },
      },
    }),
  )
}

describe('HalControl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // default: no success/error message in URL
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('always shows helper text', () => {
    makeStoreWithIdentifiers([])
    renderWithProviders()
    expect(screen.getByText(i18n.t('hal_control_helper'))).toBeInTheDocument()
  })

  it('when no HAL identifier and no login: shows only the button (no idHal, no link icon, no login badge)', () => {
    makeStoreWithIdentifiers([])

    renderWithProviders()

    // Button is shown with halProvided=false
    expect(screen.getByTestId('hal-login-button')).toHaveTextContent(
      'halProvided=false',
    )

    // No idHal labels
    expect(screen.queryByText('idHal_s')).not.toBeInTheDocument()
    expect(screen.queryByText('idHal_i')).not.toBeInTheDocument()

    // No hal_login badge
    expect(screen.queryByText('hal_login')).not.toBeInTheDocument()

    // Link icon only appears when linked
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()
  })

  it('when HAL identifier exists but no HAL_LOGIN: shows idHal badge + button, but no link icon and no login badge', () => {
    makeStoreWithIdentifiers([
      { type: PersonIdentifierType.ID_HAL_S, value: 'jacques-dupont' },
    ])

    renderWithProviders()

    // idHal badge present
    expect(screen.getByText('idHal_s')).toBeInTheDocument()
    expect(screen.getByText('jacques-dupont')).toBeInTheDocument()

    // Button shown with halProvided=true
    expect(screen.getByTestId('hal-login-button')).toHaveTextContent(
      'halProvided=true',
    )

    // No link icon
    expect(screen.queryByTestId('LinkIcon')).not.toBeInTheDocument()

    // No login badge
    expect(screen.queryByText('hal_login')).not.toBeInTheDocument()
  })

  it('when HAL identifier exists and HAL_LOGIN exists: shows link icon + idHal badge + login badge, and no button', () => {
    makeStoreWithIdentifiers([
      { type: PersonIdentifierType.ID_HAL_S, value: 'jacques-dupont' },
      { type: PersonIdentifierType.HAL_LOGIN, value: 'jdupont' },
    ])

    renderWithProviders()

    // idHal badge present
    expect(screen.getByText('idHal_s')).toBeInTheDocument()
    expect(screen.getByText('jacques-dupont')).toBeInTheDocument()

    // login badge present
    expect(screen.getByText('hal_login')).toBeInTheDocument()
    expect(screen.getByText('jdupont')).toBeInTheDocument()

    // Link icon exists
    expect(screen.getByTestId('LinkIcon')).toBeInTheDocument()

    // No button when linked
    expect(screen.queryByTestId('hal-login-button')).not.toBeInTheDocument()
  })

  it('renders the snackbar message when ?success=hal_authentication_success is present', () => {
    makeStoreWithIdentifiers([])
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams([['success', 'hal_authentication_success']]),
    )

    renderWithProviders()

    expect(
      screen.getByText(i18n.t('hal_authentication_success')),
    ).toBeInTheDocument()
  })

  it('renders the snackbar message when ?error=hal_authentication_failure_wrong_protocol is present', () => {
    makeStoreWithIdentifiers([])
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
})
